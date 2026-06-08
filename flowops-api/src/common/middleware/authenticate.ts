import type { NextFunction, Request, RequestHandler, Response } from "express";

import type { AccessTokenVerifier } from "../../auth/token-verifier";
import { getKeycloakTokenVerifier } from "../../config/keycloak";
import { AuthenticationError } from "../errors/httpErrors";
import { asyncHandler } from "./asyncHandler";

function extractBearerToken(authorizationHeader: string | undefined): string {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new AuthenticationError("Missing or invalid Authorization header");
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();

  if (!token) {
    throw new AuthenticationError("Missing or invalid Authorization header");
  }

  return token;
}

/** Factory for injecting a custom verifier in tests. */
export function createAuthenticateMiddleware(
  verifier: AccessTokenVerifier,
): RequestHandler {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractBearerToken(req.headers.authorization);
    req.user = await verifier.verifyAccessToken(token);
    next();
  });
}

/** Validates Keycloak JWT access tokens and attaches `req.user`. */
export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractBearerToken(req.headers.authorization);
    req.user = await getKeycloakTokenVerifier().verifyAccessToken(token);
    next();
  },
);
