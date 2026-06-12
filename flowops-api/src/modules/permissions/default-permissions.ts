/** Default system permission records seeded into the database. */
export interface DefaultPermissionSeed {
  key: string;
  description: string;
}

export const DEFAULT_PERMISSIONS = [
  { key: "organisation:create", description: "Create organisations" },
  { key: "organisation:view", description: "View organisation details" },
  { key: "organisation:update", description: "Update organisation settings" },
  { key: "organisation:delete", description: "Delete organisations" },

  { key: "members:view", description: "View organisation members" },
  { key: "members:invite", description: "Invite organisation members" },
  { key: "members:update-role", description: "Update member roles" },
  { key: "members:remove", description: "Remove organisation members" },

  { key: "roles:view", description: "View roles" },
  { key: "roles:create", description: "Create roles" },
  { key: "roles:update", description: "Update roles" },
  { key: "roles:delete", description: "Delete roles" },

  { key: "workflows:create", description: "Create workflow templates" },
  { key: "workflows:view", description: "View workflow templates" },
  { key: "workflows:update", description: "Update workflow templates" },
  { key: "workflows:delete", description: "Delete workflow templates" },
  { key: "workflows:activate", description: "Activate workflow templates" },
  { key: "workflows:deactivate", description: "Deactivate workflow templates" },

  { key: "requests:create", description: "Submit workflow requests" },
  { key: "requests:view-own", description: "View own workflow requests" },
  { key: "requests:view-all", description: "View all organisation workflow requests" },
  { key: "requests:cancel", description: "Cancel workflow requests" },

  { key: "approvals:view", description: "View pending approvals" },
  { key: "approvals:approve", description: "Approve workflow requests" },
  { key: "approvals:reject", description: "Reject workflow requests" },
  { key: "approvals:delegate", description: "Delegate approvals to another user" },

  { key: "notifications:view", description: "View notifications" },
  { key: "notifications:update", description: "Update notification read state" },

  { key: "auditlogs:view", description: "View audit logs" },

  { key: "reports:view", description: "View reports and analytics" },
  { key: "reports:export", description: "Export reports" },

  { key: "settings:view", description: "View organisation settings" },
  { key: "settings:update", description: "Update organisation settings" },

  { key: "apikeys:manage", description: "Manage API keys" },
  { key: "webhooks:manage", description: "Manage webhooks" },
] as const satisfies readonly DefaultPermissionSeed[];

export type DefaultPermissionKey = (typeof DEFAULT_PERMISSIONS)[number]["key"];
