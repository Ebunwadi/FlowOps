import { Router } from "express";

import { authenticate } from "../../common/middleware/authenticate";
import { ensureLocalUser } from "../../common/middleware/ensureLocalUser";
import { ensureOrganisationContext } from "../../common/middleware/ensureOrganisationContext";
import { requirePermission } from "../../common/middleware/requirePermission";
import { validateRequest } from "../../common/middleware/validateRequest";
import {
  listMyWorkflowRequestsController,
  saveDraftWorkflowRequestController,
  submitDraftWorkflowRequestController,
  submitWorkflowRequestController,
  updateDraftWorkflowRequestController,
} from "./workflow-request.controller";
import {
  listWorkflowRequestsQuerySchema,
  saveDraftWorkflowRequestSchema,
  submitWorkflowRequestSchema,
  updateDraftWorkflowRequestSchema,
  workflowRequestParamsSchema,
} from "./workflow-request.validation";

export const workflowRequestRouter = Router();

workflowRequestRouter.use(authenticate, ensureLocalUser);

workflowRequestRouter.get(
  "/my",
  ensureOrganisationContext,
  requirePermission("requests:view-own"),
  validateRequest({ query: listWorkflowRequestsQuerySchema }),
  listMyWorkflowRequestsController,
);

workflowRequestRouter.post(
  "/",
  ensureOrganisationContext,
  requirePermission("requests:create"),
  validateRequest({ body: submitWorkflowRequestSchema }),
  submitWorkflowRequestController,
);

workflowRequestRouter.post(
  "/drafts",
  ensureOrganisationContext,
  requirePermission("requests:create"),
  validateRequest({ body: saveDraftWorkflowRequestSchema }),
  saveDraftWorkflowRequestController,
);

workflowRequestRouter.patch(
  "/:id/draft",
  ensureOrganisationContext,
  requirePermission("requests:create"),
  validateRequest({
    params: workflowRequestParamsSchema,
    body: updateDraftWorkflowRequestSchema,
  }),
  updateDraftWorkflowRequestController,
);

workflowRequestRouter.post(
  "/:id/submit",
  ensureOrganisationContext,
  requirePermission("requests:create"),
  validateRequest({ params: workflowRequestParamsSchema }),
  submitDraftWorkflowRequestController,
);
