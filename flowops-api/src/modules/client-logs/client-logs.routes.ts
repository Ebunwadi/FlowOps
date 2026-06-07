import { Router } from "express";

import { validateRequest } from "../../common/middleware/validateRequest";
import { ingestClientLogsController } from "./client-logs.controller";
import { ingestClientLogsSchema } from "./client-logs.schema";

export const clientLogsRouter = Router();

clientLogsRouter.post(
  "/client",
  validateRequest({ body: ingestClientLogsSchema }),
  ingestClientLogsController,
);
