import { ConflictError, NotFoundError } from "../src/common/errors/httpErrors";
import { DEFAULT_ROLE_NAMES } from "../src/modules/roles/default-roles";
import {
  listOrganisationMembers,
  removeOrganisationMember,
  updateOrganisationMemberRole,
} from "../src/modules/members/member.service";
import * as memberRepository from "../src/modules/members/member.repository";

jest.mock("../src/modules/members/member.repository");
jest.mock("../src/modules/audit-log/audit-log.service", () => ({
  recordAuditEvent: jest.fn(),
}));

describe("member service", () => {
  const organisationId = "550e8400-e29b-41d4-a716-446655440000";
  const memberId = "660e8400-e29b-41d4-a716-446655440001";
  const actorUserId = "770e8400-e29b-41d4-a716-446655440002";

  const member = {
    id: memberId,
    userId: "880e8400-e29b-41d4-a716-446655440003",
    organisationId,
    roleId: "role-owner",
    status: "ACTIVE" as const,
    joinedAt: new Date("2026-06-11T12:00:00.000Z"),
    user: {
      id: "880e8400-e29b-41d4-a716-446655440003",
      email: "owner@flowops.local",
      firstName: "Org",
      lastName: "Owner",
    },
    role: {
      id: "role-owner",
      name: DEFAULT_ROLE_NAMES.OWNER,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listOrganisationMembers", () => {
    it("returns mapped organisation members", async () => {
      jest
        .mocked(memberRepository.findMembersByOrganisationId)
        .mockResolvedValue([member]);

      const result = await listOrganisationMembers(organisationId);

      expect(result).toEqual([
        {
          id: memberId,
          userId: member.userId,
          email: member.user.email,
          firstName: member.user.firstName,
          lastName: member.user.lastName,
          role: member.role,
          status: "ACTIVE",
          joinedAt: member.joinedAt.toISOString(),
        },
      ]);
    });
  });

  describe("updateOrganisationMemberRole", () => {
    it("updates the member role when the role belongs to the organisation", async () => {
      jest
        .mocked(memberRepository.findMemberByIdInOrganisation)
        .mockResolvedValue(member);
      jest.mocked(memberRepository.findRoleByIdInOrganisation).mockResolvedValue({
        id: "role-admin",
        name: DEFAULT_ROLE_NAMES.ADMIN,
        organisationId,
      });
      jest.mocked(memberRepository.countActiveOwnersInOrganisation).mockResolvedValue(2);
      jest.mocked(memberRepository.updateMemberRoleById).mockResolvedValue({
        ...member,
        roleId: "role-admin",
        role: {
          id: "role-admin",
          name: DEFAULT_ROLE_NAMES.ADMIN,
        },
      });

      const result = await updateOrganisationMemberRole(
        organisationId,
        memberId,
        actorUserId,
        { roleId: "role-admin" },
      );

      expect(result.role.name).toBe(DEFAULT_ROLE_NAMES.ADMIN);
    });

    it("throws when the role does not belong to the organisation", async () => {
      jest
        .mocked(memberRepository.findMemberByIdInOrganisation)
        .mockResolvedValue(member);
      jest.mocked(memberRepository.findRoleByIdInOrganisation).mockResolvedValue(null);

      await expect(
        updateOrganisationMemberRole(organisationId, memberId, actorUserId, {
          roleId: "role-admin",
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("prevents demoting the last owner", async () => {
      jest
        .mocked(memberRepository.findMemberByIdInOrganisation)
        .mockResolvedValue(member);
      jest.mocked(memberRepository.findRoleByIdInOrganisation).mockResolvedValue({
        id: "role-admin",
        name: DEFAULT_ROLE_NAMES.ADMIN,
        organisationId,
      });
      jest.mocked(memberRepository.countActiveOwnersInOrganisation).mockResolvedValue(1);

      await expect(
        updateOrganisationMemberRole(organisationId, memberId, actorUserId, {
          roleId: "role-admin",
        }),
      ).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe("removeOrganisationMember", () => {
    it("removes a non-owner member", async () => {
      const staffMember = {
        ...member,
        role: { id: "role-staff", name: DEFAULT_ROLE_NAMES.STAFF },
      };

      jest
        .mocked(memberRepository.findMemberByIdInOrganisation)
        .mockResolvedValue(staffMember);
      jest.mocked(memberRepository.deleteMemberById).mockResolvedValue();

      await removeOrganisationMember(organisationId, memberId, actorUserId);

      expect(memberRepository.deleteMemberById).toHaveBeenCalledWith(memberId);
    });

    it("prevents removing the last owner", async () => {
      jest
        .mocked(memberRepository.findMemberByIdInOrganisation)
        .mockResolvedValue(member);
      jest.mocked(memberRepository.countActiveOwnersInOrganisation).mockResolvedValue(1);

      await expect(
        removeOrganisationMember(organisationId, memberId, actorUserId),
      ).rejects.toBeInstanceOf(ConflictError);

      expect(memberRepository.deleteMemberById).not.toHaveBeenCalled();
    });
  });
});
