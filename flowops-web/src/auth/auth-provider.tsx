import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { AuthContext } from "@/auth/auth-context";
import {
  clearAccessTokenGetter,
  registerAccessTokenGetter,
} from "@/auth/token-access";
import type { AuthContextValue, AuthUser } from "@/auth/types";
import { mapKeycloakUser } from "@/auth/user-profile";
import {
  initKeycloak,
  keycloak,
  TOKEN_MIN_VALIDITY_SECONDS,
} from "@/config/keycloak";
import { clientLogger, setLoggerUserContext } from "@/lib/logger";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [initialized, setInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const syncAuthState = useCallback((authenticated: boolean) => {
    setIsAuthenticated(authenticated);
    setUser(authenticated ? mapKeycloakUser(keycloak) : null);
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | undefined> => {
    if (!keycloak.authenticated) {
      return undefined;
    }

    try {
      await keycloak.updateToken(TOKEN_MIN_VALIDITY_SECONDS);
      return keycloak.token;
    } catch {
      // Session expired or refresh failed; force a fresh login on next action.
      syncAuthState(false);
      return undefined;
    }
  }, [syncAuthState]);

  useEffect(() => {
    let cancelled = false;

    initKeycloak()
      .then((authenticated) => {
        if (cancelled) {
          return;
        }

        syncAuthState(authenticated);
        setInitialized(true);
        clientLogger.info({
          area: "auth",
          event: "session.checked",
          message: authenticated
            ? "Existing Keycloak session restored"
            : "No active Keycloak session",
          context: { authenticated },
        });

        keycloak.onAuthSuccess = () => {
          syncAuthState(true);
          clientLogger.info({
            area: "auth",
            event: "user.signed_in",
            message: "User signed in via Keycloak",
            context: {
              username: keycloak.tokenParsed?.preferred_username,
            },
          });
        };

        keycloak.onAuthLogout = () => {
          syncAuthState(false);
          clientLogger.info({
            area: "auth",
            event: "user.signed_out",
            message: "User signed out",
          });
        };

        keycloak.onTokenExpired = () => {
          void getAccessToken();
        };
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unable to connect to Keycloak.";

        setInitError(message);
        setInitialized(true);
        clientLogger.error({
          area: "auth",
          event: "keycloak.init_failed",
          message: "Failed to connect to Keycloak",
          context: { reason: message },
        });
      });

    return () => {
      cancelled = true;
      keycloak.onAuthSuccess = undefined;
      keycloak.onAuthLogout = undefined;
      keycloak.onTokenExpired = undefined;
    };
  }, [getAccessToken, syncAuthState]);

  useEffect(() => {
    registerAccessTokenGetter(getAccessToken);

    return () => {
      clearAccessTokenGetter();
    };
  }, [getAccessToken]);

  useEffect(() => {
    if (user) {
      setLoggerUserContext({ userId: user.id, username: user.username });
      return;
    }

    setLoggerUserContext({});
  }, [user]);

  const login = useCallback(async () => {
    await keycloak.login({
      redirectUri: `${window.location.origin}${window.location.pathname}`,
    });
  }, []);

  const logout = useCallback(async () => {
    await keycloak.logout({
      redirectUri: `${window.location.origin}/`,
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      initialized,
      isAuthenticated,
      user,
      login,
      logout,
      getAccessToken,
    }),
    [getAccessToken, initialized, isAuthenticated, login, logout, user],
  );

  if (!initialized) {
    return (
      <AuthContext.Provider value={value}>
        <AuthInitializingScreen />
      </AuthContext.Provider>
    );
  }

  if (initError) {
    return (
      <AuthContext.Provider value={value}>
        <AuthErrorScreen message={initError} onRetry={() => window.location.reload()} />
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function AuthInitializingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="space-y-3 text-center">
        <div
          aria-hidden="true"
          className="mx-auto size-8 animate-spin rounded-full border-2 border-muted border-t-primary"
        />
        <p className="text-sm text-muted-foreground">
          Connecting to authentication service...
        </p>
      </div>
    </div>
  );
}

interface AuthErrorScreenProps {
  message: string;
  onRetry: () => void;
}

function AuthErrorScreen({ message, onRetry }: AuthErrorScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md space-y-4 rounded-lg border p-6 text-center">
        <h1 className="text-lg font-semibold">Authentication unavailable</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <p className="text-sm text-muted-foreground">
          Ensure Keycloak is running at the URL configured in{" "}
          <code className="rounded bg-muted px-1 py-0.5">VITE_KEYCLOAK_URL</code>.
        </p>
        <button
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          onClick={onRetry}
          type="button"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
