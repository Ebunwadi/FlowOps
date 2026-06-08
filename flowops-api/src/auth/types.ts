/** Authenticated user extracted from a validated Keycloak access token. */
export interface AuthenticatedUser {
  /** Keycloak subject (`sub` claim). */
  id: string;
  username: string;
  email?: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  roles: string[];
  clientId: string;
}

/** Raw Keycloak access token claims used during verification. */
export interface KeycloakAccessTokenClaims {
  sub: string;
  preferred_username?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  azp?: string;
  realm_access?: {
    roles?: string[];
  };
}
