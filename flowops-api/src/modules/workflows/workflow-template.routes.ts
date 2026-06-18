import { Router } from "express";

import { authenticate } from "../../common/middleware/authenticate";
import { ensureLocalUser } from "../../common/middleware/ensureLocalUser";
import { ensureOrganisationContext } from "../../common/middleware/ensureOrganisationContext";
import { requirePermission } from "../../common/middleware/requirePermission";
import { validateRequest } from "../../common/middleware/validateRequest";
import { createWorkflowTemplateController } from "./workflow-template.controller";
import { createWorkflowTemplateSchema } from "./workflow-template.validation";

export const workflowTemplateRouter = Router();

workflowTemplateRouter.use(authenticate, ensureLocalUser);

workflowTemplateRouter.post(
  "/",
  ensureOrganisationContext,
  requirePermission("workflows:create"),
  validateRequest({ body: createWorkflowTemplateSchema }),
  createWorkflowTemplateController,
);
