import { Router } from "express";

import { clientLogsRouter } from "../modules/client-logs/client-logs.routes";
import { healthRouter } from "../modules/health/health.routes";
import { meRouter } from "../modules/me/me.routes";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/logs", clientLogsRouter);
apiRouter.use("/me", meRouter);
