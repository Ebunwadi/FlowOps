import { logger } from "../../config/logger";
import { dispatchOrganisationWebhookEvent } from "./webhook.delivery.service";
import type { WebhookEventType } from "./webhook-events";

interface WorkflowRequestWebhookInput {
  organisationId: string;
  workflowRequestId: string;
  workflowTemplateId: string;
  status: string;
  title?: string | null;
}

interface WorkflowRequestStepWebhookInput extends WorkflowRequestWebhookInput {
  stepId: string;
  stepName: string;
}

interface WorkflowRequestRejectedWebhookInput extends WorkflowRequestWebhookInput {
  comment?: string | null;
  rejectedStepId: string;
  rejectedStepName: string;
}

interface WorkflowRequestCommentWebhookInput {
  organisationId: string;
  workflowRequestId: string;
  workflowTemplateId: string;
  commentId: string;
  authorId: string;
  content: string;
}

function fireWebhookEvent(
  organisationId: string,
  eventType: WebhookEventType,
  payload: Record<string, unknown>,
): void {
  void dispatchOrganisationWebhookEvent({
    organisationId,
    eventType,
    payload,
  }).catch((error) => {
    logger.error(
      {
        origin: "api",
        event: "webhook_event.dispatch_failed",
        organisationId,
        eventType,
        error,
      },
      `[API] Failed to dispatch webhook event "${eventType}"`,
    );
  });
}

export function emitWorkflowRequestSubmittedWebhook(
  input: WorkflowRequestWebhookInput & {
    currentStepId: string;
    resubmitted?: boolean;
  },
): void {
  fireWebhookEvent(input.organisationId, "workflow.request.submitted", {
    requestId: input.workflowRequestId,
    workflowTemplateId: input.workflowTemplateId,
    status: input.status,
    title: input.title ?? null,
    currentStepId: input.currentStepId,
    resubmitted: input.resubmitted ?? false,
  });
}

export function emitWorkflowRequestApprovedWebhook(
  input: WorkflowRequestStepWebhookInput,
): void {
  fireWebhookEvent(input.organisationId, "workflow.request.approved", {
    requestId: input.workflowRequestId,
    workflowTemplateId: input.workflowTemplateId,
    status: input.status,
    title: input.title ?? null,
    stepId: input.stepId,
    stepName: input.stepName,
  });
}

export function emitWorkflowRequestCompletedWebhook(
  input: WorkflowRequestWebhookInput,
): void {
  fireWebhookEvent(input.organisationId, "workflow.request.completed", {
    requestId: input.workflowRequestId,
    workflowTemplateId: input.workflowTemplateId,
    status: input.status,
    title: input.title ?? null,
  });
}

export function emitWorkflowRequestRejectedWebhook(
  input: WorkflowRequestRejectedWebhookInput,
): void {
  fireWebhookEvent(input.organisationId, "workflow.request.rejected", {
    requestId: input.workflowRequestId,
    workflowTemplateId: input.workflowTemplateId,
    status: input.status,
    title: input.title ?? null,
    rejectedStepId: input.rejectedStepId,
    rejectedStepName: input.rejectedStepName,
    comment: input.comment ?? null,
  });
}

export function emitWorkflowRequestCommentAddedWebhook(
  input: WorkflowRequestCommentWebhookInput,
): void {
  fireWebhookEvent(input.organisationId, "workflow.comment.added", {
    requestId: input.workflowRequestId,
    workflowTemplateId: input.workflowTemplateId,
    commentId: input.commentId,
    authorId: input.authorId,
    content: input.content,
  });
}
