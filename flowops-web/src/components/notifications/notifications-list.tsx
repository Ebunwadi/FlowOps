import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/api/notifications";
import { NotificationTypeIcon } from "@/components/notifications/notification-type-icon";
import { Button } from "@/components/ui/button";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { formatApiErrorMessage } from "@/lib/api-errors";
import { cn } from "@/lib/utils";
import {
  formatNotificationDateTime,
  getNotificationTypeLabel,
  resolveNotificationActionPath,
  type NotificationItem,
  type NotificationReadFilter,
} from "@/types/notification";

const PAGE_SIZE = 20;

const FILTER_OPTIONS: Array<{ value: NotificationReadFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
];

export function NotificationsList({ canMarkRead = true }: { canMarkRead?: boolean }) {
  const [filter, setFilter] = useState<NotificationReadFilter>("all");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const isReadParam = useMemo(() => {
    if (filter === "unread") {
      return false;
    }

    if (filter === "read") {
      return true;
    }

    return undefined;
  }, [filter]);

  const notificationsQuery = useQuery({
    queryKey: ["notifications", filter, page],
    queryFn: () =>
      listNotifications({
        isRead: isReadParam,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const markOneMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });

  if (notificationsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <NotificationsFiltersSkeleton />
        <NotificationsListSkeleton />
      </div>
    );
  }

  if (notificationsQuery.isError) {
    return (
      <div className="space-y-4">
        <NotificationsFilters
          activeFilter={filter}
          canMarkAll={false}
          markAllPending={false}
          onFilterChange={(value) => {
            setFilter(value);
            setPage(1);
          }}
          onMarkAll={() => undefined}
        />
        <DismissibleAlert
          className="text-center"
          messageKey={formatApiErrorMessage(notificationsQuery.error)}
          variant="error"
        >
          <h3 className="text-sm font-medium text-red-900">
            Unable to load notifications
          </h3>
          <p className="mt-1 text-sm text-red-700">
            {formatApiErrorMessage(notificationsQuery.error)}
          </p>
          <Button
            className="mt-4"
            onClick={() => {
              void notificationsQuery.refetch();
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            Try again
          </Button>
        </DismissibleAlert>
      </div>
    );
  }

  const data = notificationsQuery.data;

  if (!data) {
    return null;
  }

  const { items, total, totalPages } = data;
  const hasUnread = items.some((item) => !item.isRead) || filter === "unread";

  return (
    <div className="space-y-4">
      <NotificationsFilters
        activeFilter={filter}
        canMarkAll={canMarkRead && hasUnread}
        markAllPending={markAllMutation.isPending}
        onFilterChange={(value) => {
          setFilter(value);
          setPage(1);
        }}
        onMarkAll={() => {
          markAllMutation.mutate();
        }}
      />

      {markAllMutation.isError ? (
        <DismissibleAlert variant="error">
          {formatApiErrorMessage(markAllMutation.error)}
        </DismissibleAlert>
      ) : null}

      {items.length === 0 ? (
        <NotificationsEmptyState filter={filter} />
      ) : (
        <>
          <ul className="divide-y overflow-hidden rounded-lg border bg-card shadow-sm">
            {items.map((notification) => (
              <NotificationListItem
                key={notification.id}
                canMarkRead={canMarkRead}
                markReadPending={
                  markOneMutation.isPending &&
                  markOneMutation.variables === notification.id
                }
                notification={notification}
                onMarkRead={(id) => {
                  markOneMutation.mutate(id);
                }}
                onOpen={(item) => {
                  if (!item.isRead) {
                    markOneMutation.mutate(item.id);
                  }
                }}
              />
            ))}
          </ul>

          {totalPages > 1 ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}ù
                {Math.min(page * PAGE_SIZE, total)} of {total} notifications
              </p>
              <div className="flex items-center gap-2">
                <Button
                  disabled={page <= 1}
                  onClick={() => {
                    setPage((current) => Math.max(1, current - 1));
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  disabled={page >= totalPages}
                  onClick={() => {
                    setPage((current) => current + 1);
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

interface NotificationsFiltersProps {
  activeFilter: NotificationReadFilter;
  canMarkAll: boolean;
  markAllPending: boolean;
  onFilterChange: (filter: NotificationReadFilter) => void;
  onMarkAll: () => void;
}

function NotificationsFilters({
  activeFilter,
  canMarkAll,
  markAllPending,
  onFilterChange,
  onMarkAll,
}: NotificationsFiltersProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((option) => {
          const isActive = option.value === activeFilter;
          return (
            <button
              key={option.value}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
              onClick={() => {
                onFilterChange(option.value);
              }}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <Button
        disabled={!canMarkAll || markAllPending}
        onClick={onMarkAll}
        size="sm"
        type="button"
        variant="outline"
      >
        {markAllPending ? "Marking..." : "Mark all as read"}
      </Button>
    </div>
  );
}

interface NotificationListItemProps {
  notification: NotificationItem;
  canMarkRead: boolean;
  markReadPending: boolean;
  onMarkRead: (id: string) => void;
  onOpen: (notification: NotificationItem) => void;
}

function NotificationListItem({
  notification,
  canMarkRead,
  markReadPending,
  onMarkRead,
  onOpen,
}: NotificationListItemProps) {
  const navigate = useNavigate();
  const actionPath = resolveNotificationActionPath(notification.actionUrl);

  const handleOpen = () => {
    if (canMarkRead) {
      onOpen(notification);
    }

    if (actionPath) {
      navigate(actionPath);
    }
  };

  return (
    <li
      className={cn(
        "flex gap-4 px-4 py-4 transition-colors",
        notification.isRead ? "bg-card" : "bg-primary/5",
      )}
    >
      <NotificationTypeIcon type={notification.type} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground">{notification.title}</p>
              {!notification.isRead ? (
                <span className="inline-flex rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                  Unread
                </span>
              ) : null}
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {getNotificationTypeLabel(notification.type)}
            </p>
          </div>
          <time
            className="shrink-0 text-xs text-muted-foreground"
            dateTime={notification.createdAt}
          >
            {formatNotificationDateTime(notification.createdAt)}
          </time>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{notification.message}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {actionPath ? (
            <Button onClick={handleOpen} size="sm" type="button">
              Open
            </Button>
          ) : null}
          {!notification.isRead && canMarkRead ? (
            <Button
              disabled={markReadPending}
              onClick={() => {
                onMarkRead(notification.id);
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              {markReadPending ? "Marking..." : "Mark as read"}
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function NotificationsEmptyState({ filter }: { filter: NotificationReadFilter }) {
  const title =
    filter === "unread"
      ? "No unread notifications"
      : filter === "read"
        ? "No read notifications"
        : "No notifications yet";

  const description =
    filter === "unread"
      ? "You are all caught up. New workflow alerts will appear here."
      : filter === "read"
        ? "Notifications you have read will appear here."
        : "When something needs your attention on a workflow request, it will show up here.";

  return (
    <div className="rounded-lg border border-dashed bg-card px-6 py-16 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <span aria-hidden className="text-lg text-muted-foreground">
          ?
        </span>
      </div>
      <h3 className="mt-4 text-lg font-medium">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function NotificationsFiltersSkeleton() {
  return <div className="h-[74px] animate-pulse rounded-lg border bg-muted/40" />;
}

function NotificationsListSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="divide-y p-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex gap-4 py-4">
            <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-8 w-24 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
