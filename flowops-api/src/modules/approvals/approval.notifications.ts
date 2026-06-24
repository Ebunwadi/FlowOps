import { logger } from "../../config/logger";
import {
  recordApprovalRequiredNotification,
  recordChangesRequestedNotification,
  recordRequestApprovedStepNotification,
  recordRequestCompletedNotification,
  recordRequestRejectedNotification,
} from "../notifications/notification.service";

interface ApprovalNotificationInput {
  organisationId: string;
  workflowRequestId: string;
  workflowTemplateId: string;
  stepId: string;
  approverRoleId: string;
  stepName: string;
}

interface RequesterNotificationInput {
  organisationId: string;
  workflowRequestId: string;
  workflowTemplateId: string;
  requesterId: string;
}

interface RequesterRejectionNotificationInput extends RequesterNotificationInput {
  comment: string;
}

interface RequesterStepApprovedNotificationInput extends RequesterNotificationInput {
  approvedStepName: string;
  nextStepName: string;
}

/** Persists a notification record; email delivery is deferred to a later sprint. */
export function notifyApproversOfNextStep(input: ApprovalNotificationInput): void {
  recordApprovalRequiredNotification(input);

  logger.info(
    {
      origin: "api",
      event: "approval.notification.next_step",
      organisationId: input.organisationId,
      workflowRequestId: input.workflowRequestId,
      workflowTemplateId: input.workflowTemplateId,
      stepId: input.stepId,
      approverRoleId: input.approverRoleId,
    },
    `[API] Notification recorded: approvers for step "${input.stepName}" should be notified`,
  );
}

/** Persists a notification record; email delivery is deferred to a later sprint. */
export function notifyRequesterOfApprovedStep(
  input: RequesterStepApprovedNotificationInput,
): void {
  recordRequestApprovedStepNotification(input);

  logger.info(
    {
      origin: "api",
      event: "approval.notification.step_approved",
      organisationId: input.organisationId,
      workflowRequestId: input.workflowRequestId,
      workflowTemplateId: input.workflowTemplateId,
      requesterId: input.requesterId,
    },
    `[API] Notification recorded: requester notified that "${input.approvedStepName}" was approved`,
  );
}

/** Persists a notification record; email delivery is deferred to a later sprint. */
export function notifyRequesterOfCompletedRequest(
  input: RequesterNotificationInput,
): void {
  recordRequestCompletedNotification(input);

  logger.info(
    {
      origin: "api",
      event: "approval.notification.completed",
      organisationId: input.organisationId,
      workflowRequestId: input.workflowRequestId,
      workflowTemplateId: input.workflowTemplateId,
      requesterId: input.requesterId,
    },
    "[API] Notification recorded: requester should be notified that the request is completed",
  );
}

/** Persists a notification record; email delivery is deferred to a later sprint. */
export function notifyRequesterOfRejectedRequest(
  input: RequesterRejectionNotificationInput,
): void {
  recordRequestRejectedNotification(input);

  logger.info(
    {
      origin: "api",
      event: "approval.notification.rejected",
      organisationId: input.organisationId,
      workflowRequestId: input.workflowRequestId,
      workflowTemplateId: input.workflowTemplateId,
      requesterId: input.requesterId,
    },
    "[API] Notification recorded: requester should be notified that the request was rejected",
  );
}

/** Persists a notification record; email delivery is deferred to a later sprint. */
export function notifyRequesterOfChangesRequested(
  input: RequesterRejectionNotificationInput,
): void {
  recordChangesRequestedNotification(input);

  logger.info(
    {
      origin: "api",
      event: "approval.notification.changes_requested",
      organisationId: input.organisationId,
      workflowRequestId: input.workflowRequestId,
      workflowTemplateId: input.workflowTemplateId,
      requesterId: input.requesterId,
    },
    "[API] Notification recorded: requester should be notified that changes were requested",
  );
}
