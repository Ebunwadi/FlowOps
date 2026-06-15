import { NavLink } from "react-router-dom";

import { useAuth } from "@/auth/use-auth";
import { useOrganisation } from "@/auth/use-organisation";
import { usePermissions } from "@/auth/use-permissions";
import { PROTECTED_NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function AppNav() {
  const { initialized, isAuthenticated } = useAuth();
  const { currentOrganisation } = useOrganisation();
  const { hasAnyPermission, membershipAccessLoading } = usePermissions();

  if (!initialized || !isAuthenticated || !currentOrganisation) {
    return null;
  }

  const visibleNavItems = PROTECTED_NAV_ITEMS.filter((item) => {
    if (membershipAccessLoading) {
      return false;
    }

    return hasAnyPermission(...item.permissions);
  });

  if (visibleNavItems.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-1">
      {visibleNavItems.map((item) => (
        <NavLink
          className={({ isActive }) =>
            cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )
          }
          key={item.to}
          to={item.to}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
