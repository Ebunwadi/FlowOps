import { Router } from "express";

import { authenticate } from "../common/middleware/authenticate";
import { ensureLocalUser } from "../common/middleware/ensureLocalUser";
import { getCurrentUserController } from "../modules/auth/auth.controller";
import { authRouter } from "../modules/auth/auth.routes";
import { clientLogsRouter } from "../modules/client-logs/client-logs.routes";
import { healthRouter } from "../modules/health/health.routes";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/logs", clientLogsRouter);
apiRouter.use("/auth", authRouter);
/** @deprecated Prefer GET /api/auth/me */
apiRouter.get("/me", authenticate, ensureLocalUser, getCurrentUserController);
