import type Keycloak from "keycloak-js";

import type { AuthUser } from "@/auth/types";

/** Maps Keycloak token claims to a stable application user shape. */
export function mapKeycloakUser(keycloak: Keycloak): AuthUser | null {
  const token = keycloak.tokenParsed;

  if (!token?.sub || !token.preferred_username) {
    return null;
  }

  return {
    id: token.sub,
    username: token.preferred_username,
    email: typeof token.email === "string" ? token.email : undefined,
    name: typeof token.name === "string" ? token.name : undefined,
    roles: token.realm_access?.roles ?? [],
  };
}
