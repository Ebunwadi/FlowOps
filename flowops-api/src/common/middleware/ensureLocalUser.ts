import type { NextFunction, Request, RequestHandler, Response } from "express";

import { AuthenticationError } from "../errors/httpErrors";
import { asyncHandler } from "./asyncHandler";
import { syncUserFromKeycloak } from "../../modules/users/user.service";

/**
 * Loads or creates the local User row for the authenticated Keycloak session.
 * Must run after `authenticate`.
 */
export const ensureLocalUser: RequestHandler = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AuthenticationError();
    }

    req.localUser = await syncUserFromKeycloak(req.user);
    next();
  },
);
