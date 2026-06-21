import { logger } from "../../config/logger";

interface ApproverNotificationInput {
  organisationId: string;
  workflowRequestId: string;
  workflowTemplateId: string;
  stepId: string;
  approverRoleId: string;
  stepName: string;
}

/**
 * Placeholder until the notifications module (and BullMQ queue) is built in a later
 * sprint. For now we record intent in the logs so the submit flow is complete and
 * Sprint 6 approvers have a clear hook to replace.
 */
export function notifyApproversOfPendingRequest(
  input: ApproverNotificationInput,
): void {
  logger.info(
    {
      origin: "api",
      event: "workflow_request.notification.placeholder",
      organisationId: input.organisationId,
      workflowRequestId: input.workflowRequestId,
      workflowTemplateId: input.workflowTemplateId,
      stepId: input.stepId,
      approverRoleId: input.approverRoleId,
    },
    `[API] Notification placeholder: approvers for step "${input.stepName}" should be notified`,
  );
}
