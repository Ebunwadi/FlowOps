const MEMBER_MANAGEMENT_ROLES = new Set(["Owner", "Admin"]);

export function canManageMembers(roleName: string | undefined): boolean {
  if (!roleName) {
    return false;
  }

  return MEMBER_MANAGEMENT_ROLES.has(roleName);
}

export function canViewMembers(roleName: string | undefined): boolean {
  if (!roleName) {
    return false;
  }

  return roleName === "Owner" || roleName === "Admin" || roleName === "Manager";
}
