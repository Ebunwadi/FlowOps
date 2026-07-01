export const NOTIFICATION_TYPES = [
  "APPROVAL_REQUIRED",
  "REQUEST_APPROVED",
  "REQUEST_REJECTED",
  "REQUEST_COMPLETED",
  "CHANGES_REQUESTED",
  "COMMENT_ADDED",
  "MEMBER_INVITED",
  "WORKFLOW_UPDATED",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationItem {
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
  items: NotificationItem[];
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

export type NotificationReadFilter = "all" | "unread" | "read";

export function formatNotificationDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function getNotificationTypeLabel(type: NotificationType): string {
  switch (type) {
    case "APPROVAL_REQUIRED":
      return "Approval required";
    case "REQUEST_APPROVED":
      return "Step approved";
    case "REQUEST_REJECTED":
      return "Rejected";
    case "REQUEST_COMPLETED":
      return "Completed";
    case "CHANGES_REQUESTED":
      return "Changes requested";
    case "COMMENT_ADDED":
      return "Comment";
    case "MEMBER_INVITED":
      return "Invitation";
    case "WORKFLOW_UPDATED":
      return "Workflow update";
    default:
      return type;
  }
}

export function resolveNotificationActionPath(actionUrl: string | null): string | null {
  if (!actionUrl) {
    return null;
  }

  if (/^https?:\/\//i.test(actionUrl)) {
    try {
      const url = new URL(actionUrl);
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return null;
    }
  }

  return actionUrl.startsWith("/") ? actionUrl : `/${actionUrl}`;
}
