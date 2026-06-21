import { Router } from "express";

import { authenticate } from "../../common/middleware/authenticate";
import { ensureLocalUser } from "../../common/middleware/ensureLocalUser";
import { ensureOrganisationContext } from "../../common/middleware/ensureOrganisationContext";
import { requirePermission } from "../../common/middleware/requirePermission";
import { validateRequest } from "../../common/middleware/validateRequest";
import { submitWorkflowRequestController } from "./workflow-request.controller";
import { submitWorkflowRequestSchema } from "./workflow-request.validation";

export const workflowRequestRouter = Router();

workflowRequestRouter.use(authenticate, ensureLocalUser);

workflowRequestRouter.post(
  "/",
  ensureOrganisationContext,
  requirePermission("requests:create"),
  validateRequest({ body: submitWorkflowRequestSchema }),
  submitWorkflowRequestController,
);
