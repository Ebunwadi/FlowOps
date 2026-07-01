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

export interface ListUserNotificationsFilters {
  organisationId: string;
  recipientId: string;
  isRead?: boolean;
  page: number;
  limit: number;
}

export interface CountUserNotificationsFilters {
  organisationId: string;
  recipientId: string;
  isRead?: boolean;
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

export type NotificationRecord = {
  id: string;
  type: NotificationType;
  organisationId: string;
  recipientId: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  actionUrl: string | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
};

function buildUserNotificationWhere(filters: CountUserNotificationsFilters) {
  return {
    organisationId: filters.organisationId,
    recipientId: filters.recipientId,
    ...(filters.isRead !== undefined ? { isRead: filters.isRead } : {}),
  };
}

export async function createNotificationRecord(
  input: CreateNotificationRecordInput,
  db: DbClient = prisma,
): Promise<NotificationRecord> {
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

export async function findNotificationsForUser(
  filters: ListUserNotificationsFilters,
  db: DbClient = prisma,
): Promise<NotificationRecord[]> {
  const skip = (filters.page - 1) * filters.limit;

  return db.notification.findMany({
    where: buildUserNotificationWhere(filters),
    orderBy: { createdAt: "desc" },
    skip,
    take: filters.limit,
    select: notificationSelect,
  });
}

export async function countNotificationsForUser(
  filters: CountUserNotificationsFilters,
  db: DbClient = prisma,
): Promise<number> {
  return db.notification.count({
    where: buildUserNotificationWhere(filters),
  });
}

export async function countUnreadNotificationsForUser(
  organisationId: string,
  recipientId: string,
  db: DbClient = prisma,
): Promise<number> {
  return countNotificationsForUser(
    {
      organisationId,
      recipientId,
      isRead: false,
    },
    db,
  );
}

export async function findNotificationForUser(
  notificationId: string,
  organisationId: string,
  recipientId: string,
  db: DbClient = prisma,
): Promise<NotificationRecord | null> {
  return db.notification.findFirst({
    where: {
      id: notificationId,
      organisationId,
      recipientId,
    },
    select: notificationSelect,
  });
}

export async function markNotificationAsRead(
  notificationId: string,
  organisationId: string,
  recipientId: string,
  db: DbClient = prisma,
): Promise<NotificationRecord | null> {
  const existing = await findNotificationForUser(
    notificationId,
    organisationId,
    recipientId,
    db,
  );

  if (!existing) {
    return null;
  }

  if (existing.isRead) {
    return existing;
  }

  return db.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
    select: notificationSelect,
  });
}

export async function markAllNotificationsAsReadForUser(
  organisationId: string,
  recipientId: string,
  db: DbClient = prisma,
) {
  return db.notification.updateMany({
    where: {
      organisationId,
      recipientId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

export async function findActiveRecipientsByRole(
  organisationId: string,
  roleId: string,
  db: DbClient = prisma,
): Promise<
  Array<{
    userId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  }>
> {
  const members = await db.organisationMember.findMany({
    where: {
      organisationId,
      roleId,
      status: MembershipStatus.ACTIVE,
    },
    select: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return members.map((member) => ({
    userId: member.user.id,
    email: member.user.email,
    firstName: member.user.firstName,
    lastName: member.user.lastName,
  }));
}

export async function findActiveRecipientIdsByRole(
  organisationId: string,
  roleId: string,
  db: DbClient = prisma,
): Promise<string[]> {
  const recipients = await findActiveRecipientsByRole(organisationId, roleId, db);
  return recipients.map((recipient) => recipient.userId);
}

export async function findNotificationRecipientById(
  userId: string,
  db: DbClient = prisma,
): Promise<{
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
} | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}
