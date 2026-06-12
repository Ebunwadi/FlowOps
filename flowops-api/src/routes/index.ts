import { Router } from "express";

import { authRouter } from "../modules/auth/auth.routes";
import { clientLogsRouter } from "../modules/client-logs/client-logs.routes";
import { healthRouter } from "../modules/health/health.routes";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/logs", clientLogsRouter);
apiRouter.use("/auth", authRouter);
