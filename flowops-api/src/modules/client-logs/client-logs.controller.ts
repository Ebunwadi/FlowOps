import type { Request, Response } from "express";

import { asyncHandler } from "../../common/middleware/asyncHandler";
import { sendSuccess } from "../../common/http/apiResponse";
import { logger } from "../../config/logger";
import { ingestClientLogs } from "./client-logs.service";

export const ingestClientLogsController = asyncHandler(
  async (req: Request, res: Response) => {
    const accepted = ingestClientLogs(logger, req.body.logs);

    sendSuccess(res, {
      data: { accepted },
      message: "Client logs accepted",
      statusCode: 202,
    });
  },
);
