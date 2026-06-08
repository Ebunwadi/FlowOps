/** Authenticated user extracted from a validated Keycloak access token. */
export interface AuthenticatedUser {
  id: string;
  username: string;
  email?: string;
  name?: string;
  roles: string[];
  clientId: string;
}

/** Raw Keycloak access token claims used during verification. */
export interface KeycloakAccessTokenClaims {
  sub: string;
  preferred_username?: string;
  email?: string;
  name?: string;
  azp?: string;
  realm_access?: {
    roles?: string[];
  };
}
