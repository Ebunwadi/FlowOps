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
import { getCurrentUser } from "@/api/auth";
import {
  initKeycloak,
  keycloak,
  TOKEN_MIN_VALIDITY_SECONDS,
} from "@/config/keycloak";
import { clientLogger, setLoggerUserContext } from "@/lib/logger";
import type { FlowOpsUserProfile } from "@/types/user";

interface AuthProviderProps {
  children: ReactNode;
}

function buildRedirectUri(returnPath?: string): string {
  if (!returnPath) {
    return `${window.location.origin}${window.location.pathname}${window.location.search}`;
  }

  return `${window.location.origin}${returnPath}`;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [initialized, setInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<FlowOpsUserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const syncAuthState = useCallback((authenticated: boolean) => {
    setIsAuthenticated(authenticated);
    setUser(authenticated ? mapKeycloakUser(keycloak) : null);

    if (!authenticated) {
      setProfile(null);
      setProfileLoading(false);
    }
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | undefined> => {
    if (!keycloak.authenticated) {
      return undefined;
    }

    try {
      await keycloak.updateToken(TOKEN_MIN_VALIDITY_SECONDS);
      return keycloak.token;
    } catch {
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

  useEffect(() => {
    if (!initialized || !isAuthenticated) {
      return;
    }

    let cancelled = false;

    setProfileLoading(true);

    getCurrentUser()
      .then((nextProfile) => {
        if (cancelled) {
          return;
        }

        setProfile(nextProfile);
        clientLogger.info({
          area: "auth",
          event: "profile.loaded",
          message: "FlowOps user profile loaded from API",
          context: {
            flowopsUserId: nextProfile.id,
            email: nextProfile.email,
          },
        });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setProfile(null);

        const message =
          error instanceof Error ? error.message : "Unable to load user profile.";

        clientLogger.error({
          area: "auth",
          event: "profile.load_failed",
          message: "Failed to load FlowOps user profile from API",
          context: { reason: message },
        });
      })
      .finally(() => {
        if (!cancelled) {
          setProfileLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [initialized, isAuthenticated, user?.id]);

  const login = useCallback(async (returnPath?: string) => {
    await keycloak.login({
      redirectUri: buildRedirectUri(returnPath),
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
      initError,
      user,
      profile,
      profileLoading,
      login,
      logout,
      getAccessToken,
    }),
    [
      getAccessToken,
      initError,
      initialized,
      isAuthenticated,
      login,
      logout,
      profile,
      profileLoading,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
