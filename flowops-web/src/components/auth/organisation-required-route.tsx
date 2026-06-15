import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useOrganisation } from "@/auth/use-organisation";
import {
  AuthErrorScreen,
  AuthLoadingScreen,
} from "@/components/auth/auth-loading-screen";

/**
 * Ensures the authenticated user belongs to at least one organisation before
 * accessing main application routes.
 */
export function OrganisationRequiredRoute() {
  const location = useLocation();
  const { organisations, organisationsLoading, organisationsError } =
    useOrganisation();

  if (organisationsLoading) {
    return <AuthLoadingScreen message="Loading your organisations..." />;
  }

  if (organisationsError) {
    return (
      <AuthErrorScreen
        message={organisationsError}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (organisations.length === 0) {
    return (
      <Navigate
        replace
        state={{ from: location.pathname }}
        to="/organisation/setup"
      />
    );
  }

  return <Outlet />;
}
