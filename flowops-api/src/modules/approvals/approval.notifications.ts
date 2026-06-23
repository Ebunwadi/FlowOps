import { logger } from "../../config/logger";

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

/** Placeholder until the notifications module is built in a later sprint. */
export function notifyApproversOfNextStep(input: ApprovalNotificationInput): void {
  logger.info(
    {
      origin: "api",
      event: "approval.notification.next_step.placeholder",
      organisationId: input.organisationId,
      workflowRequestId: input.workflowRequestId,
      workflowTemplateId: input.workflowTemplateId,
      stepId: input.stepId,
      approverRoleId: input.approverRoleId,
    },
    `[API] Notification placeholder: approvers for step "${input.stepName}" should be notified`,
  );
}

/** Placeholder until the notifications module is built in a later sprint. */
export function notifyRequesterOfCompletedRequest(
  input: RequesterNotificationInput,
): void {
  logger.info(
    {
      origin: "api",
      event: "approval.notification.completed.placeholder",
      organisationId: input.organisationId,
      workflowRequestId: input.workflowRequestId,
      workflowTemplateId: input.workflowTemplateId,
      requesterId: input.requesterId,
    },
    "[API] Notification placeholder: requester should be notified that the request is completed",
  );
}
