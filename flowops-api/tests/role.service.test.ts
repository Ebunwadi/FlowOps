import {
  DEFAULT_ORGANISATION_ROLES,
  DEFAULT_ROLE_NAMES,
} from "../src/modules/roles/default-roles";
import * as roleRepository from "../src/modules/roles/role.repository";
import {
  createDefaultRolesForOrganisation,
  MissingPermissionsError,
} from "../src/modules/roles/role.service";

jest.mock("../src/modules/roles/role.repository");

describe("createDefaultRolesForOrganisation", () => {
  const organisationId = "org-1";

  const permissionRecords = DEFAULT_ORGANISATION_ROLES.flatMap((role) =>
    role.permissions.map((key, index) => ({
      id: `${key}-${index}`,
      key,
      description: key,
    })),
  ).filter(
    (permission, index, array) =>
      array.findIndex((entry) => entry.key === permission.key) === index,
  );

  const db = {
    role: {
      create: jest.fn(async (args: { data: { name: string } }) => ({
        id: `role-${args.data.name}`,
        organisationId,
        name: args.data.name,
        description: null,
        isSystemRole: true,
        createdAt: new Date(),
      })),
    },
    rolePermission: {
      createMany: jest.fn(async () => ({ count: 1 })),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(roleRepository.findPermissionsByKeys)
      .mockResolvedValue(permissionRecords);
  });

  it("creates all default roles and attaches permissions", async () => {
    const roles = await createDefaultRolesForOrganisation(organisationId, db as never);

    expect(roleRepository.findPermissionsByKeys).toHaveBeenCalledTimes(1);
    expect(db.role.create).toHaveBeenCalledTimes(5);
    expect(db.rolePermission.createMany).toHaveBeenCalledTimes(5);
    expect(roles[DEFAULT_ROLE_NAMES.OWNER].name).toBe(DEFAULT_ROLE_NAMES.OWNER);
    expect(roles[DEFAULT_ROLE_NAMES.STAFF].name).toBe(DEFAULT_ROLE_NAMES.STAFF);
  });

  it("throws when seeded permissions are missing from the database", async () => {
    jest.mocked(roleRepository.findPermissionsByKeys).mockResolvedValue([]);

    await expect(
      createDefaultRolesForOrganisation(organisationId, db as never),
    ).rejects.toBeInstanceOf(MissingPermissionsError);

    expect(db.role.create).not.toHaveBeenCalled();
  });
});
