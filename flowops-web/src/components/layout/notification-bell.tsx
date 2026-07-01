import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  getUnreadNotificationCount,
  listNotifications,
  markNotificationAsRead,
} from "@/api/notifications";
import { useAuth } from "@/auth/use-auth";
import { useOrganisation } from "@/auth/use-organisation";
import { usePermissions } from "@/auth/use-permissions";
import { NotificationTypeIcon } from "@/components/notifications/notification-type-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatNotificationDateTime,
  resolveNotificationActionPath,
  type NotificationItem,
} from "@/types/notification";

function formatUnreadBadgeCount(count: number): string {
  if (count > 99) {
    return "99+";
  }

  return String(count);
}

export function NotificationBell() {
  const { initialized, isAuthenticated } = useAuth();
  const { currentOrganisation } = useOrganisation();
  const { hasPermission, membershipAccessLoading } = usePermissions();
  const canViewNotifications = hasPermission("notifications:view");
  const canUpdateNotifications = hasPermission("notifications:update");

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const canFetchNotifications =
    initialized &&
    isAuthenticated &&
    Boolean(currentOrganisation) &&
    canViewNotifications &&
    !membershipAccessLoading;

  const unreadCountQuery = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadNotificationCount,
    enabled: canFetchNotifications,
  });

  const previewQuery = useQuery({
    queryKey: ["notifications", "preview"],
    queryFn: () => listNotifications({ page: 1, limit: 5 }),
    enabled: canFetchNotifications && isOpen,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  if (!canFetchNotifications) {
    return null;
  }

  const unreadCount = unreadCountQuery.data?.count ?? 0;

  const handlePreviewOpen = (notification: NotificationItem) => {
    const actionPath = resolveNotificationActionPath(notification.actionUrl);

    if (!notification.isRead && canUpdateNotifications) {
      markReadMutation.mutate(notification.id);
    }

    setIsOpen(false);

    if (actionPath) {
      navigate(actionPath);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border bg-background text-foreground transition-colors hover:bg-muted"
        onClick={() => {
          setIsOpen((current) => !current);
        }}
        type="button"
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {formatUnreadBadgeCount(unreadCount)}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-card shadow-lg">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
                : "You are all caught up"}
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {previewQuery.isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-14 animate-pulse rounded bg-muted/50" />
                ))}
              </div>
            ) : previewQuery.isError ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                Unable to load notification preview.
              </p>
            ) : (previewQuery.data?.items.length ?? 0) === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                No notifications yet.
              </p>
            ) : (
              <ul className="divide-y">
                {previewQuery.data?.items.map((notification) => (
                  <li key={notification.id}>
                    <button
                      className={cn(
                        "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                        !notification.isRead && "bg-primary/5",
                      )}
                      onClick={() => {
                        handlePreviewOpen(notification);
                      }}
                      type="button"
                    >
                      <NotificationTypeIcon
                        className="h-8 w-8 text-xs"
                        type={notification.type}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="truncate text-sm font-medium text-foreground">
                            {notification.title}
                          </span>
                          {!notification.isRead ? (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                          ) : null}
                        </span>
                        <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {notification.message}
                        </span>
                        <time
                          className="mt-1 block text-[11px] text-muted-foreground"
                          dateTime={notification.createdAt}
                        >
                          {formatNotificationDateTime(notification.createdAt)}
                        </time>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t px-4 py-3">
            <Button asChild className="w-full" size="sm" type="button" variant="outline">
              <Link
                onClick={() => {
                  setIsOpen(false);
                }}
                to="/notifications"
              >
                View all notifications
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      aria-hidden
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      viewBox="0 0 24 24"
    >
      <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
      <path d="M13.7 21a2 2 0 01-3.4 0" />
    </svg>
  );
}
