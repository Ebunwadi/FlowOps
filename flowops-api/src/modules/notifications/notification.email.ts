import { LogOrigin } from "../../common/logging/logFormat";
import { logger } from "../../config/logger";
import { enqueueSendEmailJob } from "../../jobs/queues/email.queue";
import { EMAIL_TEMPLATE_NAMES } from "../email/email.types";

export interface NotificationEmailRecipient {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export type ApprovalRequiredEmailRecipient = NotificationEmailRecipient;

function formatRecipientDisplayName(
  firstName: string | null,
  lastName: string | null,
): string {
  const parts = [firstName?.trim(), lastName?.trim()].filter(
    (value): value is string => Boolean(value),
  );

  return parts.length > 0 ? parts.join(" ") : "there";
}

async function enqueueEmailForRecipient(input: {
  recipient: NotificationEmailRecipient;
  subject: string;
  template: string;
  data: Record<string, unknown>;
  failureEvent: string;
}): Promise<void> {
  try {
    await enqueueSendEmailJob({
      to: input.recipient.email,
      subject: input.subject,
      template: input.template,
      data: input.data,
    });
  } catch (error) {
    logger.error(
      {
        origin: LogOrigin.API,
        event: input.failureEvent,
        recipientId: input.recipient.userId,
        template: input.template,
        error,
      },
      `[API] Failed to enqueue ${input.template} email for ${input.recipient.email}`,
    );
  }
}

export async function enqueueApprovalRequiredEmails(input: {
  recipients: NotificationEmailRecipient[];
  requestTitle?: string | null;
  workflowName?: string | null;
  actionUrl: string;
}): Promise<void> {
  if (input.recipients.length === 0) {
    return;
  }

  const requestTitle = input.requestTitle?.trim() || "A workflow request";
  const workflowName = input.workflowName?.trim() || "Workflow";

  await Promise.all(
    input.recipients.map(async (recipient) =>
      enqueueEmailForRecipient({
        recipient,
        subject: "Approval required",
        template: EMAIL_TEMPLATE_NAMES.APPROVAL_REQUIRED,
        data: {
          recipientName: formatRecipientDisplayName(
            recipient.firstName,
            recipient.lastName,
          ),
          requestTitle,
          workflowName,
          actionUrl: input.actionUrl,
        },
        failureEvent: "notification.email_enqueue_failed",
      }),
    ),
  );
}

export async function enqueueRequestCompletedEmail(input: {
  recipient: NotificationEmailRecipient;
  requestTitle?: string | null;
  actionUrl: string;
}): Promise<void> {
  await enqueueEmailForRecipient({
    recipient: input.recipient,
    subject: "Request completed",
    template: EMAIL_TEMPLATE_NAMES.REQUEST_COMPLETED,
    data: {
      recipientName: formatRecipientDisplayName(
        input.recipient.firstName,
        input.recipient.lastName,
      ),
      requestTitle: input.requestTitle?.trim() || "Your request",
      actionUrl: input.actionUrl,
    },
    failureEvent: "notification.email_enqueue_failed",
  });
}

export async function enqueueRequestRejectedEmail(input: {
  recipient: NotificationEmailRecipient;
  requestTitle?: string | null;
  comment: string;
  actionUrl: string;
}): Promise<void> {
  await enqueueEmailForRecipient({
    recipient: input.recipient,
    subject: "Request rejected",
    template: EMAIL_TEMPLATE_NAMES.REQUEST_REJECTED,
    data: {
      recipientName: formatRecipientDisplayName(
        input.recipient.firstName,
        input.recipient.lastName,
      ),
      requestTitle: input.requestTitle?.trim() || "Your request",
      comment: input.comment,
      actionUrl: input.actionUrl,
    },
    failureEvent: "notification.email_enqueue_failed",
  });
}

export async function enqueueChangesRequestedEmail(input: {
  recipient: NotificationEmailRecipient;
  requestTitle?: string | null;
  comment: string;
  actionUrl: string;
}): Promise<void> {
  await enqueueEmailForRecipient({
    recipient: input.recipient,
    subject: "Changes requested",
    template: EMAIL_TEMPLATE_NAMES.CHANGES_REQUESTED,
    data: {
      recipientName: formatRecipientDisplayName(
        input.recipient.firstName,
        input.recipient.lastName,
      ),
      requestTitle: input.requestTitle?.trim() || "Your request",
      comment: input.comment,
      actionUrl: input.actionUrl,
    },
    failureEvent: "notification.email_enqueue_failed",
  });
}
