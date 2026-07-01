import { cn } from "@/lib/utils";
import {
  getNotificationTypeLabel,
  type NotificationType,
} from "@/types/notification";

const typeStyles: Record<NotificationType, string> = {
  APPROVAL_REQUIRED: "bg-amber-100 text-amber-800",
  REQUEST_APPROVED: "bg-emerald-100 text-emerald-800",
  REQUEST_REJECTED: "bg-red-100 text-red-800",
  REQUEST_COMPLETED: "bg-emerald-100 text-emerald-800",
  CHANGES_REQUESTED: "bg-orange-100 text-orange-800",
  COMMENT_ADDED: "bg-blue-100 text-blue-800",
  MEMBER_INVITED: "bg-violet-100 text-violet-800",
  WORKFLOW_UPDATED: "bg-slate-100 text-slate-700",
};

const typeSymbols: Record<NotificationType, string> = {
  APPROVAL_REQUIRED: "A",
  REQUEST_APPROVED: "P",
  REQUEST_REJECTED: "X",
  REQUEST_COMPLETED: "C",
  CHANGES_REQUESTED: "E",
  COMMENT_ADDED: "M",
  MEMBER_INVITED: "I",
  WORKFLOW_UPDATED: "W",
};

interface NotificationTypeIconProps {
  type: NotificationType;
  className?: string;
}

export function NotificationTypeIcon({ type, className }: NotificationTypeIconProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
        typeStyles[type],
        className,
      )}
      title={getNotificationTypeLabel(type)}
    >
      {typeSymbols[type]}
    </span>
  );
}
