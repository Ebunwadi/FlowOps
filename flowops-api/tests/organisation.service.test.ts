import { MembershipStatus } from "../src/generated/prisma/client";
import { prisma } from "../src/config/database";
import { DEFAULT_ROLE_NAMES } from "../src/modules/roles/default-roles";
import { createOrganisation } from "../src/modules/organisations/organisation.service";
import * as roleService from "../src/modules/roles/role.service";

jest.mock("../src/config/database", () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

jest.mock("../src/modules/roles/role.service");

describe("createOrganisation", () => {
  const input = {
    name: "Acme University",
    slug: "acme-university",
    createdById: "user-1",
  };

  const organisation = {
    id: "org-1",
    name: input.name,
    slug: input.slug,
    createdById: input.createdById,
    createdAt: new Date("2026-06-11T12:00:00.000Z"),
    updatedAt: new Date("2026-06-11T12:00:00.000Z"),
  };

  const roles = {
    [DEFAULT_ROLE_NAMES.OWNER]: {
      id: "role-owner",
      organisationId: organisation.id,
      name: DEFAULT_ROLE_NAMES.OWNER,
      description: "Full access",
      isSystemRole: true,
      createdAt: new Date(),
    },
    [DEFAULT_ROLE_NAMES.ADMIN]: {
      id: "role-admin",
      organisationId: organisation.id,
      name: DEFAULT_ROLE_NAMES.ADMIN,
      description: null,
      isSystemRole: true,
      createdAt: new Date(),
    },
    [DEFAULT_ROLE_NAMES.MANAGER]: {
      id: "role-manager",
      organisationId: organisation.id,
      name: DEFAULT_ROLE_NAMES.MANAGER,
      description: null,
      isSystemRole: true,
      createdAt: new Date(),
    },
    [DEFAULT_ROLE_NAMES.APPROVER]: {
      id: "role-approver",
      organisationId: organisation.id,
      name: DEFAULT_ROLE_NAMES.APPROVER,
      description: null,
      isSystemRole: true,
      createdAt: new Date(),
    },
    [DEFAULT_ROLE_NAMES.STAFF]: {
      id: "role-staff",
      organisationId: organisation.id,
      name: DEFAULT_ROLE_NAMES.STAFF,
      description: null,
      isSystemRole: true,
      createdAt: new Date(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    jest.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const tx = {
        organisation: {
          create: jest.fn().mockResolvedValue(organisation),
        },
        organisationMember: {
          create: jest.fn().mockResolvedValue({
            id: "member-1",
            userId: input.createdById,
            organisationId: organisation.id,
            roleId: roles[DEFAULT_ROLE_NAMES.OWNER].id,
            status: MembershipStatus.ACTIVE,
            joinedAt: new Date("2026-06-11T12:00:00.000Z"),
          }),
        },
      };

      return callback(tx as never);
    });

    jest
      .mocked(roleService.createDefaultRolesForOrganisation)
      .mockResolvedValue(roles);
  });

  it("creates the organisation, default roles, and owner membership in one transaction", async () => {
    const result = await createOrganisation(input);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(roleService.createDefaultRolesForOrganisation).toHaveBeenCalledWith(
      organisation.id,
      expect.any(Object),
    );
    expect(result.organisation).toEqual(organisation);
    expect(result.membership.roleId).toBe(roles[DEFAULT_ROLE_NAMES.OWNER].id);
    expect(result.membership.userId).toBe(input.createdById);
    expect(result.roles).toEqual(roles);
  });

  it("rolls back organisation creation when default role setup fails", async () => {
    jest
      .mocked(roleService.createDefaultRolesForOrganisation)
      .mockRejectedValue(new Error("role setup failed"));

    await expect(createOrganisation(input)).rejects.toThrow("role setup failed");
  });
});
