import type { NotificationEvent, Prisma } from "../../generated/prisma/client";
import type { DbClient } from "../../common/types/database";
import { prisma } from "../../config/database";

export interface CreateNotificationRecordInput {
  organisationId: string;
  event: NotificationEvent;
  recipientUserId?: string | null;
  recipientRoleId?: string | null;
  workflowRequestId?: string | null;
  title: string;
  body?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export async function createNotificationRecord(
  input: CreateNotificationRecordInput,
  db: DbClient = prisma,
) {
  return db.notification.create({
    data: {
      organisationId: input.organisationId,
      event: input.event,
      recipientUserId: input.recipientUserId ?? null,
      recipientRoleId: input.recipientRoleId ?? null,
      workflowRequestId: input.workflowRequestId ?? null,
      title: input.title,
      body: input.body ?? null,
      metadata: input.metadata ?? undefined,
    },
    select: {
      id: true,
      event: true,
      organisationId: true,
      recipientUserId: true,
      recipientRoleId: true,
      workflowRequestId: true,
    },
  });
}
