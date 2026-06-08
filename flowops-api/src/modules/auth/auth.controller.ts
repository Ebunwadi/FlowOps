import type { Request, Response } from "express";

import { AuthenticationError } from "../../common/errors/httpErrors";
import { asyncHandler } from "../../common/middleware/asyncHandler";
import { sendSuccess } from "../../common/http/apiResponse";
import { toUserProfileResponse } from "../users/user.mapper";

export const getCurrentUserController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user || !req.localUser) {
      throw new AuthenticationError();
    }

    sendSuccess(res, {
      data: toUserProfileResponse(req.localUser, req.user),
      message: "Current user retrieved successfully",
    });
  },
);
