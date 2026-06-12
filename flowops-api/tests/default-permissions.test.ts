import { DEFAULT_PERMISSIONS } from "../src/modules/permissions/default-permissions";

describe("DEFAULT_PERMISSIONS", () => {
  it("defines the expected Sprint 3 permission keys without duplicates", () => {
    const keys = DEFAULT_PERMISSIONS.map((permission) => permission.key);

    expect(keys).toHaveLength(35);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual(
      expect.arrayContaining([
        "organisation:create",
        "members:invite",
        "workflows:activate",
        "requests:view-all",
        "approvals:delegate",
        "auditlogs:view",
        "apikeys:manage",
        "webhooks:manage",
      ]),
    );
  });

  it("includes a non-empty description for every permission", () => {
    for (const permission of DEFAULT_PERMISSIONS) {
      expect(permission.description.trim().length).toBeGreaterThan(0);
    }
  });
});
