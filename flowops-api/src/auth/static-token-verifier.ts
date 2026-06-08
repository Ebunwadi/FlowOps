import jwt from "jsonwebtoken";

import { AuthenticationError } from "../common/errors/httpErrors";
import type { KeycloakAccessTokenClaims } from "./types";
import { mapVerifiedToken, type AccessTokenVerifier } from "./token-verifier";

/** Verifier backed by a static public key — used in unit tests without Keycloak. */
export class StaticKeyTokenVerifier implements AccessTokenVerifier {
  private readonly issuer: string;
  private readonly expectedClientId: string;
  private readonly publicKeyPem: string;

  public constructor(
    issuer: string,
    expectedClientId: string,
    publicKeyPem: string,
  ) {
    this.issuer = issuer;
    this.expectedClientId = expectedClientId;
    this.publicKeyPem = publicKeyPem;
  }

  public async verifyAccessToken(token: string): Promise<ReturnType<typeof mapVerifiedToken>> {
    try {
      const payload = jwt.verify(token, this.publicKeyPem, {
        algorithms: ["RS256"],
        issuer: this.issuer,
      }) as KeycloakAccessTokenClaims;

      return mapVerifiedToken(payload, this.expectedClientId);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }

      throw new AuthenticationError("Invalid or expired access token");
    }
  }
}
