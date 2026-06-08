import type { Request, Response } from "express";

import { asyncHandler } from "../../common/middleware/asyncHandler";
import { AuthenticationError } from "../../common/errors/httpErrors";
import { sendSuccess } from "../../common/http/apiResponse";

export const getMeController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError();
  }

  sendSuccess(res, {
    data: req.user,
    message: "Authenticated user profile",
  });
});
