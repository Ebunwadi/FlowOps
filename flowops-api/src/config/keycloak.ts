import { KeycloakTokenVerifier } from "../auth/keycloak-token-verifier";
import type { AccessTokenVerifier } from "../auth/token-verifier";
import { env } from "./env";

let verifier: AccessTokenVerifier | null = null;

/** Lazy singleton — JWKS is only fetched on the first authenticated request. */
export function getKeycloakTokenVerifier(): AccessTokenVerifier {
  if (!verifier) {
    verifier = new KeycloakTokenVerifier({
      issuer: env.keycloakIssuer,
      expectedClientId: env.keycloakClientId,
      jwksUri: env.keycloakJwksUri,
    });
  }

  return verifier;
}

/** Resets the cached verifier (used in tests). */
export function resetKeycloakTokenVerifier(): void {
  verifier = null;
}
