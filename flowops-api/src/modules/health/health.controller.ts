import type { Request, Response } from "express";

import { asyncHandler } from "../../common/middleware/asyncHandler";
import { sendSuccess } from "../../common/http/apiResponse";
import { getHealth } from "./health.service";

export const getHealthController = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, {
    data: await getHealth(),
    message: "Service is healthy",
  });
});
