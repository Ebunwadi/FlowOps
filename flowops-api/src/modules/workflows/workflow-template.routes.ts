import { Router } from "express";

import { authenticate } from "../../common/middleware/authenticate";
import { ensureLocalUser } from "../../common/middleware/ensureLocalUser";
import { ensureOrganisationContext } from "../../common/middleware/ensureOrganisationContext";
import { requirePermission } from "../../common/middleware/requirePermission";
import { validateRequest } from "../../common/middleware/validateRequest";
import {
  createWorkflowTemplateController,
  getWorkflowTemplateByIdController,
  listWorkflowTemplatesController,
  updateWorkflowTemplateController,
} from "./workflow-template.controller";
import {
  createWorkflowTemplateSchema,
  listWorkflowTemplatesQuerySchema,
  updateWorkflowTemplateSchema,
  workflowTemplateParamsSchema,
} from "./workflow-template.validation";

export const workflowTemplateRouter = Router();

workflowTemplateRouter.use(authenticate, ensureLocalUser);

workflowTemplateRouter.get(
  "/",
  ensureOrganisationContext,
  requirePermission("workflows:view"),
  validateRequest({ query: listWorkflowTemplatesQuerySchema }),
  listWorkflowTemplatesController,
);

workflowTemplateRouter.post(
  "/",
  ensureOrganisationContext,
  requirePermission("workflows:create"),
  validateRequest({ body: createWorkflowTemplateSchema }),
  createWorkflowTemplateController,
);

workflowTemplateRouter.get(
  "/:id",
  ensureOrganisationContext,
  requirePermission("workflows:view"),
  validateRequest({ params: workflowTemplateParamsSchema }),
  getWorkflowTemplateByIdController,
);

workflowTemplateRouter.patch(
  "/:id",
  ensureOrganisationContext,
  requirePermission("workflows:update"),
  validateRequest({
    params: workflowTemplateParamsSchema,
    body: updateWorkflowTemplateSchema,
  }),
  updateWorkflowTemplateController,
);
