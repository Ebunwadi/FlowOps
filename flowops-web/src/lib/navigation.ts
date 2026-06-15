export interface NavItem {
  label: string;
  to: string;
  permissions: readonly string[];
}

export const PROTECTED_NAV_ITEMS: readonly NavItem[] = [
  {
    label: "Dashboard",
    to: "/dashboard",
    permissions: ["organisation:view"],
  },
  {
    label: "Workflows",
    to: "/workflows",
    permissions: ["workflows:view"],
  },
  {
    label: "Requests",
    to: "/requests",
    permissions: ["requests:view-own", "requests:view-all", "requests:create"],
  },
  {
    label: "Members",
    to: "/organisation/members",
    permissions: ["members:view"],
  },
  {
    label: "Audit Logs",
    to: "/audit-logs",
    permissions: ["auditlogs:view"],
  },
  {
    label: "Settings",
    to: "/settings",
    permissions: ["settings:view"],
  },
] as const;
