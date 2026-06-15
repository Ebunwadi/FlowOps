export function hasPermission(
  permissions: ReadonlySet<string> | readonly string[],
  permissionKey: string,
): boolean {
  if (permissions instanceof Set) {
    return permissions.has(permissionKey);
  }

  return (permissions as readonly string[]).includes(permissionKey);
}

export function hasAnyPermission(
  permissions: ReadonlySet<string> | readonly string[],
  permissionKeys: readonly string[],
): boolean {
  return permissionKeys.some((permissionKey) =>
    hasPermission(permissions, permissionKey),
  );
}

export function hasAllPermissions(
  permissions: ReadonlySet<string> | readonly string[],
  permissionKeys: readonly string[],
): boolean {
  return permissionKeys.every((permissionKey) =>
    hasPermission(permissions, permissionKey),
  );
}
