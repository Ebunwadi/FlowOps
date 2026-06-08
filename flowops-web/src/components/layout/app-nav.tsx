import { NavLink } from "react-router-dom";

import { useAuth } from "@/auth/use-auth";
import { cn } from "@/lib/utils";

const protectedNavItems = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Workflows", to: "/workflows" },
  { label: "Requests", to: "/requests" },
  { label: "Settings", to: "/settings" },
] as const;

export function AppNav() {
  const { initialized, isAuthenticated } = useAuth();

  if (!initialized || !isAuthenticated) {
    return null;
  }

  return (
    <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-1">
      {protectedNavItems.map((item) => (
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
