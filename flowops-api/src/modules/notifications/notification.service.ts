import type { NotificationEvent, Prisma } from "../../generated/prisma/client";
import { logger } from "../../config/logger";
import { createNotificationRecord } from "./notification.repository";

export const NOTIFICATION_EVENTS = {
  APPROVAL_REQUIRED: "APPROVAL_REQUIRED",
  REQUEST_APPROVED_STEP: "REQUEST_APPROVED_STEP",
  REQUEST_REJECTED: "REQUEST_REJECTED",
  REQUEST_COMPLETED: "REQUEST_COMPLETED",
  CHANGES_REQUESTED: "CHANGES_REQUESTED",
} as const satisfies Record<string, NotificationEvent>;

export interface RecordNotificationInput {
  organisationId: string;
  event: NotificationEvent;
  recipientUserId?: string | null;
  recipientRoleId?: string | null;
  workflowRequestId?: string | null;
  title: string;
  body?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export function recordNotification(input: RecordNotificationInput): void {
  void createNotificationRecord(input).catch((error) => {
    logger.error(
      {
        origin: "api",
        event: "notification.record_failed",
        notificationEvent: input.event,
        organisationId: input.organisationId,
        workflowRequestId: input.workflowRequestId,
        error,
      },
      "[API] Failed to persist notification record",
    );
  });
}

interface WorkflowRequestNotificationContext {
  organisationId: string;
  workflowRequestId: string;
  workflowTemplateId: string;
}

interface RoleApprovalNotificationContext extends WorkflowRequestNotificationContext {
  stepId: string;
  approverRoleId: string;
  stepName: string;
}

interface RequesterNotificationContext extends WorkflowRequestNotificationContext {
  requesterId: string;
}

interface RequesterCommentNotificationContext extends RequesterNotificationContext {
  comment: string;
}

interface RequesterStepApprovedContext extends RequesterNotificationContext {
  approvedStepName: string;
  nextStepName: string;
}

export function recordApprovalRequiredNotification(
  input: RoleApprovalNotificationContext,
): void {
  recordNotification({
    organisationId: input.organisationId,
    event: NOTIFICATION_EVENTS.APPROVAL_REQUIRED,
    recipientRoleId: input.approverRoleId,
    workflowRequestId: input.workflowRequestId,
    title: `Approval required: ${input.stepName}`,
    body: `A workflow request is waiting for approval at step "${input.stepName}".`,
    metadata: {
      workflowTemplateId: input.workflowTemplateId,
      stepId: input.stepId,
      stepName: input.stepName,
      approverRoleId: input.approverRoleId,
    },
  });
}

export function recordRequestApprovedStepNotification(
  input: RequesterStepApprovedContext,
): void {
  recordNotification({
    organisationId: input.organisationId,
    event: NOTIFICATION_EVENTS.REQUEST_APPROVED_STEP,
    recipientUserId: input.requesterId,
    workflowRequestId: input.workflowRequestId,
    title: `Step approved: ${input.approvedStepName}`,
    body: `Your request was approved at "${input.approvedStepName}" and moved to "${input.nextStepName}".`,
    metadata: {
      workflowTemplateId: input.workflowTemplateId,
      approvedStepName: input.approvedStepName,
      nextStepName: input.nextStepName,
    },
  });
}

export function recordRequestCompletedNotification(
  input: RequesterNotificationContext,
): void {
  recordNotification({
    organisationId: input.organisationId,
    event: NOTIFICATION_EVENTS.REQUEST_COMPLETED,
    recipientUserId: input.requesterId,
    workflowRequestId: input.workflowRequestId,
    title: "Request completed",
    body: "Your workflow request has been fully approved.",
    metadata: {
      workflowTemplateId: input.workflowTemplateId,
    },
  });
}

export function recordRequestRejectedNotification(
  input: RequesterCommentNotificationContext,
): void {
  recordNotification({
    organisationId: input.organisationId,
    event: NOTIFICATION_EVENTS.REQUEST_REJECTED,
    recipientUserId: input.requesterId,
    workflowRequestId: input.workflowRequestId,
    title: "Request rejected",
    body: input.comment,
    metadata: {
      workflowTemplateId: input.workflowTemplateId,
      comment: input.comment,
    },
  });
}

export function recordChangesRequestedNotification(
  input: RequesterCommentNotificationContext,
): void {
  recordNotification({
    organisationId: input.organisationId,
    event: NOTIFICATION_EVENTS.CHANGES_REQUESTED,
    recipientUserId: input.requesterId,
    workflowRequestId: input.workflowRequestId,
    title: "Changes requested",
    body: input.comment,
    metadata: {
      workflowTemplateId: input.workflowTemplateId,
      comment: input.comment,
    },
  });
}
