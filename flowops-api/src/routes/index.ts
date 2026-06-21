import { Router } from "express";

import { authRouter } from "../modules/auth/auth.routes";
import { clientLogsRouter } from "../modules/client-logs/client-logs.routes";
import { healthRouter } from "../modules/health/health.routes";
import { organisationRouter } from "../modules/organisations/organisation.routes";
import { workflowRequestRouter } from "../modules/workflow-requests/workflow-request.routes";
import { workflowTemplateRouter } from "../modules/workflows/workflow-template.routes";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/logs", clientLogsRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/organisations", organisationRouter);
apiRouter.use("/workflow-templates", workflowTemplateRouter);
apiRouter.use("/workflow-requests", workflowRequestRouter);
