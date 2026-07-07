import {
  findActiveOutOfOfficeRuleForUser,
} from "./out-of-office.repository";
import {
  findNotificationRecipientById,
  type findActiveRecipientsByRole,
} from "../notifications/notification.repository";

type RoleRecipient = Awaited<
  ReturnType<typeof findActiveRecipientsByRole>
>[number];

export interface ApprovalNotificationReassignment {
  outOfOfficeUserId: string;
  delegateToId: string;
}

export interface ResolvedApprovalNotificationRecipients {
  recipients: RoleRecipient[];
  reassignments: ApprovalNotificationReassignment[];
}

export async function resolveApprovalNotificationRecipients(
  organisationId: string,
  roleRecipients: RoleRecipient[],
): Promise<ResolvedApprovalNotificationRecipients> {
  const recipients: RoleRecipient[] = [];
  const reassignments: ApprovalNotificationReassignment[] = [];
  const seenRecipientIds = new Set<string>();

  for (const recipient of roleRecipients) {
    const activeRule = await findActiveOutOfOfficeRuleForUser(
      organisationId,
      recipient.userId,
    );

    if (activeRule) {
      reassignments.push({
        outOfOfficeUserId: recipient.userId,
        delegateToId: activeRule.delegateToId,
      });

      if (seenRecipientIds.has(activeRule.delegateToId)) {
        continue;
      }

      const delegateRecipient = await findNotificationRecipientById(
        activeRule.delegateToId,
      );

      if (!delegateRecipient) {
        continue;
      }

      seenRecipientIds.add(delegateRecipient.userId);
      recipients.push(delegateRecipient);
      continue;
    }

    if (seenRecipientIds.has(recipient.userId)) {
      continue;
    }

    seenRecipientIds.add(recipient.userId);
    recipients.push(recipient);
  }

  return { recipients, reassignments };
}
