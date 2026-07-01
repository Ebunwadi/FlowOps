import { logger } from "../../config/logger";
import { recordApprovalRequiredNotification } from "../notifications/notification.service";

interface ApproverNotificationInput {
  organisationId: string;
  workflowRequestId: string;
  workflowTemplateId: string;
  stepId: string;
  approverRoleId: string;
  stepName: string;
  requestTitle?: string | null;
  workflowName?: string | null;
}

/** Persists a notification record; email delivery is deferred to a later sprint. */
export function notifyApproversOfPendingRequest(
  input: ApproverNotificationInput,
): void {
  recordApprovalRequiredNotification(input);

  logger.info(
    {
      origin: "api",
      event: "workflow_request.notification.approval_required",
      organisationId: input.organisationId,
      workflowRequestId: input.workflowRequestId,
      workflowTemplateId: input.workflowTemplateId,
      stepId: input.stepId,
      approverRoleId: input.approverRoleId,
    },
    `[API] Notification recorded: approvers for step "${input.stepName}" should be notified`,
  );
}
