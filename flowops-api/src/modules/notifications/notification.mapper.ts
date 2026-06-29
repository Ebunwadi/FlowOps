import type { NotificationType } from "../../generated/prisma/client";

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  actionUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface PaginatedNotificationsResponse {
  items: NotificationResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UnreadNotificationCountResponse {
  count: number;
}

export interface MarkAllNotificationsReadResponse {
  updatedCount: number;
}

export function toNotificationResponse(notification: {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  actionUrl: string | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}): NotificationResponse {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    entityType: notification.entityType,
    entityId: notification.entityId,
    actionUrl: notification.actionUrl,
    isRead: notification.isRead,
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
    createdAt: notification.createdAt.toISOString(),
  };
}
