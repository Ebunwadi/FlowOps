import { AuthenticationError } from "../common/errors/httpErrors";
import type { AuthenticatedUser, KeycloakAccessTokenClaims } from "./types";

export interface AccessTokenVerifier {
  verifyAccessToken(token: string): Promise<AuthenticatedUser>;
}

export function mapVerifiedToken(
  claims: KeycloakAccessTokenClaims,
  expectedClientId: string,
): AuthenticatedUser {
  const clientId = claims.azp;

  if (!clientId || clientId !== expectedClientId) {
    throw new AuthenticationError("Invalid or expired access token");
  }

  if (!claims.sub || !claims.preferred_username) {
    throw new AuthenticationError("Invalid or expired access token");
  }

  return {
    id: claims.sub,
    username: claims.preferred_username,
    email: claims.email,
    name: claims.name,
    roles: claims.realm_access?.roles ?? [],
    clientId,
  };
}
