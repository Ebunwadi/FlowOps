import { apiClient } from "@/api/client";
import type {
  MarkAllNotificationsReadResponse,
  NotificationItem,
  PaginatedNotificationsResponse,
  UnreadNotificationCountResponse,
} from "@/types/notification";

export interface ListNotificationsParams {
  isRead?: boolean;
  page?: number;
  limit?: number;
}

function buildQueryString(params: ListNotificationsParams): string {
  const searchParams = new URLSearchParams();

  if (params.isRead !== undefined) {
    searchParams.set("isRead", String(params.isRead));
  }

  if (params.page !== undefined) {
    searchParams.set("page", String(params.page));
  }

  if (params.limit !== undefined) {
    searchParams.set("limit", String(params.limit));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function listNotifications(
  params: ListNotificationsParams = {},
): Promise<PaginatedNotificationsResponse> {
  return apiClient<PaginatedNotificationsResponse>(
    `/notifications${buildQueryString(params)}`,
  );
}

export function getUnreadNotificationCount(): Promise<UnreadNotificationCountResponse> {
  return apiClient<UnreadNotificationCountResponse>("/notifications/unread-count");
}

export function markNotificationAsRead(notificationId: string): Promise<NotificationItem> {
  return apiClient<NotificationItem>(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

export function markAllNotificationsAsRead(): Promise<MarkAllNotificationsReadResponse> {
  return apiClient<MarkAllNotificationsReadResponse>("/notifications/read-all", {
    method: "PATCH",
  });
}
