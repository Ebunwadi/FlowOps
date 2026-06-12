import type { Request, Response } from "express";

import { asyncHandler } from "../../common/middleware/asyncHandler";
import { sendSuccess } from "../../common/http/apiResponse";
import { logger } from "../../config/logger";
import { ingestClientLogs } from "./client-logs.service";
import type { IngestClientLogsInput } from "./client-logs.schema";

export const ingestClientLogsController = asyncHandler(
  (req: Request, res: Response): Promise<void> => {
    const { logs } = req.body as IngestClientLogsInput;
    const accepted = ingestClientLogs(logger, logs);

    sendSuccess(res, {
      data: { accepted },
      message: "Client logs accepted",
      statusCode: 202,
    });

    return Promise.resolve();
  },
);
