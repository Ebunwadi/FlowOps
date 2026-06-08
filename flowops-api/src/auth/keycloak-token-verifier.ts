import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

import { AuthenticationError } from "../common/errors/httpErrors";
import type { KeycloakAccessTokenClaims } from "./types";
import {
  mapVerifiedToken,
  type AccessTokenVerifier,
} from "./token-verifier";

export interface KeycloakTokenVerifierOptions {
  issuer: string;
  expectedClientId: string;
  jwksUri: string;
}

/** Validates Keycloak access tokens using the realm JWKS endpoint. */
export class KeycloakTokenVerifier implements AccessTokenVerifier {
  private readonly issuer: string;
  private readonly expectedClientId: string;
  private readonly jwks: jwksClient.JwksClient;

  public constructor(options: KeycloakTokenVerifierOptions) {
    this.issuer = options.issuer;
    this.expectedClientId = options.expectedClientId;
    this.jwks = jwksClient({
      cache: true,
      cacheMaxAge: 600_000,
      jwksUri: options.jwksUri,
      rateLimit: true,
    });
  }

  public async verifyAccessToken(token: string): Promise<ReturnType<typeof mapVerifiedToken>> {
    try {
      const payload = await this.verifyJwt(token);
      return mapVerifiedToken(payload, this.expectedClientId);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }

      throw new AuthenticationError("Invalid or expired access token");
    }
  }

  private verifyJwt(token: string): Promise<KeycloakAccessTokenClaims> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        (header, callback) => {
          if (!header.kid) {
            callback(new Error("Missing key id"));
            return;
          }

          this.jwks.getSigningKey(header.kid, (error, key) => {
            if (error || !key) {
              callback(error ?? new Error("Signing key not found"));
              return;
            }

            callback(null, key.getPublicKey());
          });
        },
        {
          algorithms: ["RS256"],
          issuer: this.issuer,
        },
        (error, decoded) => {
          if (error || !decoded || typeof decoded === "string") {
            reject(error ?? new Error("Invalid token payload"));
            return;
          }

          resolve(decoded as KeycloakAccessTokenClaims);
        },
      );
    });
  }
}
