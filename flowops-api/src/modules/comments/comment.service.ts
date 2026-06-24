import {
  AuthorizationError,
  NotFoundError,
} from "../../common/errors/httpErrors";
import { logger } from "../../config/logger";
import type { CreateWorkflowRequestCommentBody } from "../approvals/approval.validation";
import {
  viewerCanAccessWorkflowRequest,
  type WorkflowRequestViewer,
} from "../workflow-requests/workflow-request.access";
import {
  createWorkflowRequestComment,
  findWorkflowRequestComments,
  findWorkflowRequestForCommentAccess,
} from "./comment.repository";
import {
  toWorkflowRequestCommentResponse,
  type WorkflowRequestCommentResponse,
} from "./comment.mapper";

async function assertViewerCanAccessRequestComments(
  viewer: WorkflowRequestViewer,
  request: {
    requesterId: string;
    currentStep: { approverRoleId: string } | null;
  },
): Promise<void> {
  const canAccess = await viewerCanAccessWorkflowRequest(viewer, {
    requesterId: request.requesterId,
    currentStepApproverRoleId: request.currentStep?.approverRoleId ?? null,
  });

  if (!canAccess) {
    throw new AuthorizationError(
      "You do not have permission to access comments on this workflow request",
    );
  }
}

export async function listWorkflowRequestComments(
  organisationId: string,
  viewer: WorkflowRequestViewer,
  workflowRequestId: string,
): Promise<WorkflowRequestCommentResponse[]> {
  const request = await findWorkflowRequestForCommentAccess(
    workflowRequestId,
    organisationId,
  );

  if (!request) {
    throw new NotFoundError("Workflow request not found");
  }

  await assertViewerCanAccessRequestComments(viewer, request);

  const comments = await findWorkflowRequestComments(workflowRequestId);
  return comments.map(toWorkflowRequestCommentResponse);
}

export async function createWorkflowRequestCommentRecord(
  organisationId: string,
  viewer: WorkflowRequestViewer,
  workflowRequestId: string,
  input: CreateWorkflowRequestCommentBody,
): Promise<WorkflowRequestCommentResponse> {
  const request = await findWorkflowRequestForCommentAccess(
    workflowRequestId,
    organisationId,
  );

  if (!request) {
    throw new NotFoundError("Workflow request not found");
  }

  await assertViewerCanAccessRequestComments(viewer, request);

  const comment = await createWorkflowRequestComment({
    workflowRequestId,
    authorId: viewer.userId,
    content: input.content,
  });

  logger.info(
    {
      origin: "api",
      event: "workflow_request.comment_created",
      organisationId,
      workflowRequestId,
      authorId: viewer.userId,
      commentId: comment.id,
    },
    `[API] Comment added to workflow request "${workflowRequestId}"`,
  );

  return toWorkflowRequestCommentResponse(comment);
}
