import { Router } from "express";

import { authenticate } from "../../common/middleware/authenticate";
import { ensureLocalUser } from "../../common/middleware/ensureLocalUser";
import { ensureOrganisationContext } from "../../common/middleware/ensureOrganisationContext";
import { requirePermission } from "../../common/middleware/requirePermission";
import { validateRequest } from "../../common/middleware/validateRequest";
import {
  cancelWorkflowRequestController,
  getWorkflowRequestDetailController,
  listMyWorkflowRequestsController,
  listOrganisationWorkflowRequestsController,
  saveDraftWorkflowRequestController,
  submitDraftWorkflowRequestController,
  submitWorkflowRequestController,
  updateDraftWorkflowRequestController,
} from "./workflow-request.controller";
import {
  createWorkflowRequestCommentController,
  listWorkflowRequestCommentsController,
} from "../comments/comment.controller";
import {
  approveWorkflowRequestController,
  rejectWorkflowRequestController,
  requestChangesWorkflowRequestController,
} from "../approvals/approval.controller";
import {
  approveWorkflowRequestSchema,
  createWorkflowRequestCommentSchema,
  rejectWorkflowRequestSchema,
  requestChangesWorkflowRequestSchema,
  workflowRequestApprovalParamsSchema,
} from "../approvals/approval.validation";
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

workflowRequestRouter.get(
  "/",
  ensureOrganisationContext,
  requirePermission("requests:view-all"),
  validateRequest({ query: listWorkflowRequestsQuerySchema }),
  listOrganisationWorkflowRequestsController,
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

workflowRequestRouter.post(
  "/:id/cancel",
  ensureOrganisationContext,
  requirePermission("requests:cancel"),
  validateRequest({ params: workflowRequestParamsSchema }),
  cancelWorkflowRequestController,
);

workflowRequestRouter.post(
  "/:id/approve",
  ensureOrganisationContext,
  requirePermission("approvals:approve"),
  validateRequest({
    params: workflowRequestApprovalParamsSchema,
    body: approveWorkflowRequestSchema,
  }),
  approveWorkflowRequestController,
);

workflowRequestRouter.post(
  "/:id/reject",
  ensureOrganisationContext,
  requirePermission("approvals:reject"),
  validateRequest({
    params: workflowRequestApprovalParamsSchema,
    body: rejectWorkflowRequestSchema,
  }),
  rejectWorkflowRequestController,
);

workflowRequestRouter.post(
  "/:id/request-changes",
  ensureOrganisationContext,
  requirePermission("approvals:reject"),
  validateRequest({
    params: workflowRequestApprovalParamsSchema,
    body: requestChangesWorkflowRequestSchema,
  }),
  requestChangesWorkflowRequestController,
);

workflowRequestRouter.get(
  "/:id/comments",
  ensureOrganisationContext,
  validateRequest({ params: workflowRequestParamsSchema }),
  listWorkflowRequestCommentsController,
);

workflowRequestRouter.post(
  "/:id/comments",
  ensureOrganisationContext,
  validateRequest({
    params: workflowRequestParamsSchema,
    body: createWorkflowRequestCommentSchema,
  }),
  createWorkflowRequestCommentController,
);

// Access control (requester / view-all / assigned approver) is enforced in the service.
workflowRequestRouter.get(
  "/:id",
  ensureOrganisationContext,
  validateRequest({ params: workflowRequestParamsSchema }),
  getWorkflowRequestDetailController,
);
