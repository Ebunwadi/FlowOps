import { useMemo } from "react";

import { useOrganisation } from "@/auth/use-organisation";
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from "@/lib/permissions";

export function usePermissions() {
  const { membershipAccess, membershipAccessLoading } = useOrganisation();

  const permissionSet = useMemo(
    () => new Set(membershipAccess?.permissions ?? []),
    [membershipAccess?.permissions],
  );

  return useMemo(
    () => ({
      membershipAccess,
      membershipAccessLoading,
      hasPermission: (permissionKey: string) =>
        hasPermission(permissionSet, permissionKey),
      hasAnyPermission: (...permissionKeys: string[]) =>
        hasAnyPermission(permissionSet, permissionKeys),
      hasAllPermissions: (...permissionKeys: string[]) =>
        hasAllPermissions(permissionSet, permissionKeys),
    }),
    [membershipAccess, membershipAccessLoading, permissionSet],
  );
}
