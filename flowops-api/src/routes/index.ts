import { Router } from "express";

import { aiRouter } from "../modules/ai/ai.routes";
import { apiKeyRouter } from "../modules/api-keys/api-key.routes";
import { externalRouter } from "../modules/external/external.routes";
import { approvalRouter } from "../modules/approvals/approval.routes";
import { attachmentRouter } from "../modules/attachments/attachment.routes";
import { authRouter } from "../modules/auth/auth.routes";
import { clientLogsRouter } from "../modules/client-logs/client-logs.routes";
import { healthRouter } from "../modules/health/health.routes";
import { notificationRouter } from "../modules/notifications/notification.routes";
import { organisationSettingsRouter } from "../modules/organisation-settings/organisation-settings.routes";
import { organisationRouter } from "../modules/organisations/organisation.routes";
import { workflowRequestRouter } from "../modules/workflow-requests/workflow-request.routes";
import { workflowTemplateRouter } from "../modules/workflows/workflow-template.routes";
import { webhookRouter } from "../modules/webhooks/webhook.routes";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/logs", clientLogsRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/organisations", organisationRouter);
apiRouter.use("/organisation-settings", organisationSettingsRouter);
apiRouter.use("/workflow-templates", workflowTemplateRouter);
apiRouter.use("/workflow-requests", workflowRequestRouter);
apiRouter.use("/attachments", attachmentRouter);
apiRouter.use("/approvals", approvalRouter);
apiRouter.use("/ai", aiRouter);
apiRouter.use("/api-keys", apiKeyRouter);
apiRouter.use("/webhooks", webhookRouter);
apiRouter.use("/external", externalRouter);
apiRouter.use("/notifications", notificationRouter);
