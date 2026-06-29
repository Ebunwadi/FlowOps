import type { NotificationType } from "../../generated/prisma/client";
import type { DbClient } from "../../common/types/database";
import { MembershipStatus } from "../../generated/prisma/client";
import { prisma } from "../../config/database";

export interface CreateNotificationRecordInput {
  organisationId: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  actionUrl?: string | null;
}

const notificationSelect = {
  id: true,
  type: true,
  organisationId: true,
  recipientId: true,
  title: true,
  message: true,
  entityType: true,
  entityId: true,
  actionUrl: true,
  isRead: true,
  readAt: true,
  createdAt: true,
} as const;

export async function createNotificationRecord(
  input: CreateNotificationRecordInput,
  db: DbClient = prisma,
) {
  return db.notification.create({
    data: {
      organisationId: input.organisationId,
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      message: input.message,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      actionUrl: input.actionUrl ?? null,
    },
    select: notificationSelect,
  });
}

export async function createManyNotificationRecords(
  inputs: CreateNotificationRecordInput[],
  db: DbClient = prisma,
) {
  if (inputs.length === 0) {
    return { count: 0 };
  }

  return db.notification.createMany({
    data: inputs.map((input) => ({
      organisationId: input.organisationId,
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      message: input.message,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      actionUrl: input.actionUrl ?? null,
    })),
  });
}

export async function findActiveRecipientIdsByRole(
  organisationId: string,
  roleId: string,
  db: DbClient = prisma,
): Promise<string[]> {
  const members = await db.organisationMember.findMany({
    where: {
      organisationId,
      roleId,
      status: MembershipStatus.ACTIVE,
    },
    select: {
      userId: true,
    },
  });

  return members.map((member) => member.userId);
}
