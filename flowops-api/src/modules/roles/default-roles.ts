import {
  DEFAULT_PERMISSIONS,
  type DefaultPermissionKey,
} from "../permissions/default-permissions";

export const DEFAULT_ROLE_NAMES = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  APPROVER: "Approver",
  STAFF: "Staff",
} as const;

export type DefaultRoleName =
  (typeof DEFAULT_ROLE_NAMES)[keyof typeof DEFAULT_ROLE_NAMES];

export interface DefaultRoleDefinition {
  name: DefaultRoleName;
  description: string;
  permissions: readonly DefaultPermissionKey[];
}

const ALL_PERMISSION_KEYS = DEFAULT_PERMISSIONS.map(
  (permission) => permission.key,
);

/** Admin permissions — full access except organisation deletion and role management. */
const ADMIN_PERMISSION_KEYS = [
  "organisation:view",
  "organisation:update",
  "members:view",
  "members:invite",
  "members:update-role",
  "members:remove",
  "roles:view",
  "workflows:create",
  "workflows:view",
  "workflows:update",
  "workflows:delete",
  "workflows:activate",
  "workflows:deactivate",
  "requests:create",
  "requests:view-own",
  "requests:view-all",
  "requests:cancel",
  "approvals:view",
  "approvals:approve",
  "approvals:reject",
  "approvals:delegate",
  "notifications:view",
  "notifications:update",
  "auditlogs:view",
  "reports:view",
  "reports:export",
  "settings:view",
  "settings:update",
  "apikeys:manage",
  "webhooks:manage",
] as const satisfies readonly DefaultPermissionKey[];

const MANAGER_PERMISSION_KEYS = [
  "organisation:view",
  "members:view",
  "workflows:view",
  "requests:create",
  "requests:view-own",
  "requests:view-all",
  "approvals:view",
  "approvals:approve",
  "approvals:reject",
  "approvals:delegate",
  "notifications:view",
  "notifications:update",
  "reports:view",
] as const satisfies readonly DefaultPermissionKey[];

const APPROVER_PERMISSION_KEYS = [
  "organisation:view",
  "workflows:view",
  "requests:create",
  "requests:view-own",
  "approvals:view",
  "approvals:approve",
  "approvals:reject",
  "notifications:view",
  "notifications:update",
] as const satisfies readonly DefaultPermissionKey[];

const STAFF_PERMISSION_KEYS = [
  "organisation:view",
  "workflows:view",
  "requests:create",
  "requests:view-own",
  "notifications:view",
  "notifications:update",
] as const satisfies readonly DefaultPermissionKey[];

export const DEFAULT_ORGANISATION_ROLES: readonly DefaultRoleDefinition[] = [
  {
    name: DEFAULT_ROLE_NAMES.OWNER,
    description: "Full access to the organisation.",
    permissions: ALL_PERMISSION_KEYS,
  },
  {
    name: DEFAULT_ROLE_NAMES.ADMIN,
    description:
      "Manage workflows, members, requests, reports, audit logs, and integrations.",
    permissions: ADMIN_PERMISSION_KEYS,
  },
  {
    name: DEFAULT_ROLE_NAMES.MANAGER,
    description:
      "Submit requests, view team activity, and approve assigned items.",
    permissions: MANAGER_PERMISSION_KEYS,
  },
  {
    name: DEFAULT_ROLE_NAMES.APPROVER,
    description: "View and act on assigned approvals.",
    permissions: APPROVER_PERMISSION_KEYS,
  },
  {
    name: DEFAULT_ROLE_NAMES.STAFF,
    description: "Submit and track own workflow requests.",
    permissions: STAFF_PERMISSION_KEYS,
  },
];
