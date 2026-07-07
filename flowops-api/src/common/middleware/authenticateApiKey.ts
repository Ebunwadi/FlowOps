import type { NextFunction, Request, RequestHandler, Response } from "express";

import { asyncHandler } from "./asyncHandler";
import {
  authenticateApiKey,
  extractApiKeyFromHeaders,
} from "../../modules/api-keys/api-key.auth.service";
import type { ApiKeyAuthenticationResult } from "../../modules/api-keys/api-key.types";

export type ApiKeyAuthenticator = (
  rawKey: string,
) => Promise<ApiKeyAuthenticationResult>;

export function createAuthenticateApiKeyMiddleware(
  authenticator: ApiKeyAuthenticator = authenticateApiKey,
): RequestHandler {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    const rawKey = extractApiKeyFromHeaders(req.headers);
    const auth = await authenticator(rawKey);

    req.organisation = auth.organisation;
    req.apiKey = auth.apiKey;
    req.authMethod = "api-key";

    next();
  });
}

/** Authenticates external requests using the `x-api-key` header. */
export const authenticateApiKeyMiddleware = createAuthenticateApiKeyMiddleware();
