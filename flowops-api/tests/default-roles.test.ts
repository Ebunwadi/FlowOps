import { DEFAULT_PERMISSIONS } from "../src/modules/permissions/default-permissions";
import {
  DEFAULT_ORGANISATION_ROLES,
  DEFAULT_ROLE_NAMES,
} from "../src/modules/roles/default-roles";

const allPermissionKeys = DEFAULT_PERMISSIONS.map((permission) => permission.key);

function permissionsForRole(name: string): string[] {
  const role = DEFAULT_ORGANISATION_ROLES.find((entry) => entry.name === name);

  if (!role) {
    throw new Error(`Role not found: ${name}`);
  }

  return [...role.permissions];
}

describe("DEFAULT_ORGANISATION_ROLES", () => {
  it("defines the five default organisation roles", () => {
    expect(DEFAULT_ORGANISATION_ROLES.map((role) => role.name)).toEqual([
      DEFAULT_ROLE_NAMES.OWNER,
      DEFAULT_ROLE_NAMES.ADMIN,
      DEFAULT_ROLE_NAMES.MANAGER,
      DEFAULT_ROLE_NAMES.APPROVER,
      DEFAULT_ROLE_NAMES.STAFF,
    ]);
  });

  it("grants Owner every seeded permission", () => {
    expect(permissionsForRole(DEFAULT_ROLE_NAMES.OWNER).sort()).toEqual(
      [...allPermissionKeys].sort(),
    );
  });

  it("grants Admin full operational access without organisation deletion or role management", () => {
    const adminPermissions = permissionsForRole(DEFAULT_ROLE_NAMES.ADMIN);

    expect(adminPermissions).not.toContain("organisation:delete");
    expect(adminPermissions).not.toContain("organisation:create");
    expect(adminPermissions).not.toContain("roles:create");
    expect(adminPermissions).not.toContain("roles:update");
    expect(adminPermissions).not.toContain("roles:delete");
    expect(adminPermissions).toContain("workflows:create");
    expect(adminPermissions).toContain("apikeys:manage");
    expect(adminPermissions).toHaveLength(30);
  });

  it("scopes Staff to submitting and tracking own requests", () => {
    expect(permissionsForRole(DEFAULT_ROLE_NAMES.STAFF)).toEqual([
      "organisation:view",
      "workflows:view",
      "requests:create",
      "requests:view-own",
      "notifications:view",
      "notifications:update",
    ]);
  });

  it("uses only valid permission keys across all roles", () => {
    const validKeys = new Set(allPermissionKeys);

    for (const role of DEFAULT_ORGANISATION_ROLES) {
      for (const permissionKey of role.permissions) {
        expect(validKeys.has(permissionKey)).toBe(true);
      }
    }
  });
});
