/** Profile information extracted from the Keycloak access token. */
export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  name?: string;
  roles: string[];
}

export interface AuthContextValue {
  /** True once Keycloak has finished its initial session check. */
  initialized: boolean;
  /** True when the user has an active Keycloak session. */
  isAuthenticated: boolean;
  /** Parsed user profile when authenticated; otherwise null. */
  user: AuthUser | null;
  /** Redirects the browser to the Keycloak login page. */
  login: () => Promise<void>;
  /** Ends the Keycloak session and returns the user to the app origin. */
  logout: () => Promise<void>;
  /** Returns the current access token, refreshing it when close to expiry. */
  getAccessToken: () => Promise<string | undefined>;
}
