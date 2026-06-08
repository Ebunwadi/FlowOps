import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/auth/use-auth";
import {
  AuthErrorScreen,
  AuthLoadingScreen,
} from "@/components/auth/auth-loading-screen";
import { clientLogger } from "@/lib/logger";

/**
 * Route guard for pages that require a Keycloak session.
 * Waits for the silent SSO check, then redirects unauthenticated users to login.
 */
export function ProtectedRoute() {
  const { initialized, isAuthenticated, initError, login } = useAuth();
  const location = useLocation();
  const loginRedirectStarted = useRef(false);

  useEffect(() => {
    if (!initialized || isAuthenticated || initError || loginRedirectStarted.current) {
      return;
    }

    loginRedirectStarted.current = true;

    clientLogger.info({
      area: "auth",
      event: "route.login_redirect",
      message: "Unauthenticated access blocked — redirecting to Keycloak login",
      context: { path: location.pathname },
    });

    void login(`${location.pathname}${location.search}`);
  }, [initialized, isAuthenticated, initError, location.pathname, location.search, login]);

  if (!initialized) {
    return <AuthLoadingScreen message="Checking your session..." />;
  }

  if (initError) {
    return (
      <AuthErrorScreen message={initError} onRetry={() => window.location.reload()} />
    );
  }

  if (!isAuthenticated) {
    return <AuthLoadingScreen message="Redirecting to sign in..." />;
  }

  return <Outlet />;
}
