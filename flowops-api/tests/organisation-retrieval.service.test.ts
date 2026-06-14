import { NotFoundError } from "../src/common/errors/httpErrors";
import { DEFAULT_ROLE_NAMES } from "../src/modules/roles/default-roles";
import * as organisationRepository from "../src/modules/organisations/organisation.repository";
import {
  getCurrentOrganisationForUser,
  getOrganisationByIdForUser,
  listOrganisationsForUser,
  updateOrganisationForUser,
} from "../src/modules/organisations/organisation.service";

jest.mock("../src/modules/organisations/organisation.repository");

describe("organisation service retrieval and updates", () => {
  const userId = "user-1";
  const organisationId = "550e8400-e29b-41d4-a716-446655440000";

  const organisation = {
    id: organisationId,
    name: "FlowOps Demo Organisation",
    slug: "flowops-demo",
    createdById: userId,
    createdAt: new Date("2026-06-11T12:00:00.000Z"),
    updatedAt: new Date("2026-06-11T12:00:00.000Z"),
  };

  const membership = {
    id: "member-1",
    userId,
    organisationId,
    roleId: "role-owner",
    status: "ACTIVE" as const,
    joinedAt: new Date("2026-06-11T12:00:00.000Z"),
    organisation,
    role: {
      id: "role-owner",
      name: DEFAULT_ROLE_NAMES.OWNER,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listOrganisationsForUser", () => {
    it("maps active memberships to organisation responses", async () => {
      jest
        .mocked(organisationRepository.findActiveMembershipsForUser)
        .mockResolvedValue([membership]);

      const result = await listOrganisationsForUser(userId);

      expect(result).toEqual([
        {
          id: organisation.id,
          name: organisation.name,
          slug: organisation.slug,
          role: DEFAULT_ROLE_NAMES.OWNER,
          createdAt: organisation.createdAt.toISOString(),
          updatedAt: organisation.updatedAt.toISOString(),
        },
      ]);
    });
  });

  describe("getCurrentOrganisationForUser", () => {
    it("returns the most recently joined organisation", async () => {
      jest
        .mocked(organisationRepository.findActiveMembershipsForUser)
        .mockResolvedValue([membership]);

      const result = await getCurrentOrganisationForUser(userId);

      expect(result.role).toBe(DEFAULT_ROLE_NAMES.OWNER);
      expect(result.id).toBe(organisationId);
    });

    it("throws when the user has no memberships", async () => {
      jest
        .mocked(organisationRepository.findActiveMembershipsForUser)
        .mockResolvedValue([]);

      await expect(getCurrentOrganisationForUser(userId)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe("getOrganisationByIdForUser", () => {
    it("returns the organisation when the user is a member", async () => {
      jest
        .mocked(organisationRepository.findActiveMembershipForUserInOrganisation)
        .mockResolvedValue(membership);

      const result = await getOrganisationByIdForUser(organisationId, userId);

      expect(result.id).toBe(organisationId);
    });

    it("throws when the user is not a member", async () => {
      jest
        .mocked(organisationRepository.findActiveMembershipForUserInOrganisation)
        .mockResolvedValue(null);

      await expect(
        getOrganisationByIdForUser(organisationId, userId),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("updateOrganisationForUser", () => {
    it("updates the organisation for a member", async () => {
      jest
        .mocked(organisationRepository.findActiveMembershipForUserInOrganisation)
        .mockResolvedValue(membership);
      jest.mocked(organisationRepository.updateOrganisationById).mockResolvedValue({
        ...organisation,
        name: "Updated Name",
      });

      const result = await updateOrganisationForUser(organisationId, userId, {
        name: "Updated Name",
      });

      expect(result.name).toBe("Updated Name");
    });

    it("throws when the user is not a member", async () => {
      jest
        .mocked(organisationRepository.findActiveMembershipForUserInOrganisation)
        .mockResolvedValue(null);

      await expect(
        updateOrganisationForUser(organisationId, userId, { name: "Updated Name" }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
