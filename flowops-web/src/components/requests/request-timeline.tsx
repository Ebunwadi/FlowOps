import { cn } from "@/lib/utils";
import {
  formatWorkflowRequestDateTime,
  type WorkflowRequestTimelineItem,
  type WorkflowRequestTimelineStatus,
} from "@/types/workflow-request";

const STATUS_LABELS: Record<WorkflowRequestTimelineStatus, string> = {
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CHANGES_REQUESTED: "Changes requested",
  CURRENT: "Awaiting decision",
  WAITING: "Waiting",
  SKIPPED: "Skipped",
};

const STATUS_DOT_STYLES: Record<WorkflowRequestTimelineStatus, string> = {
  APPROVED: "bg-emerald-500 border-emerald-500",
  REJECTED: "bg-red-500 border-red-500",
  CHANGES_REQUESTED: "bg-orange-500 border-orange-500",
  CURRENT: "bg-primary border-primary",
  WAITING: "bg-background border-muted-foreground/40",
  SKIPPED: "bg-muted border-muted-foreground/30",
};

const STATUS_BADGE_STYLES: Record<WorkflowRequestTimelineStatus, string> = {
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
  CHANGES_REQUESTED: "bg-orange-50 text-orange-700",
  CURRENT: "bg-primary/10 text-primary",
  WAITING: "bg-muted text-muted-foreground",
  SKIPPED: "bg-muted text-muted-foreground",
};

export function RequestTimeline({
  items,
}: {
  items: WorkflowRequestTimelineItem[];
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No approval steps defined for this workflow.
      </p>
    );
  }

  return (
    <ol className="space-y-0">
      {items.map((item, index) => (
        <li key={item.stepId} className="relative flex gap-4 pb-6 last:pb-0">
          {index < items.length - 1 ? (
            <span
              aria-hidden
              className="absolute left-[11px] top-6 h-full w-px bg-border"
            />
          ) : null}
          <span
            aria-hidden
            className={cn(
              "relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
              STATUS_DOT_STYLES[item.status],
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground">{item.stepName}</p>
              <span
                className={cn(
                  "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                  STATUS_BADGE_STYLES[item.status],
                )}
              >
                {STATUS_LABELS[item.status]}
              </span>
            </div>
            {item.actor || item.date ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {item.actor ? <span>{item.actor}</span> : null}
                {item.actor && item.date ? <span className="mx-1">·</span> : null}
                {item.date ? (
                  <span>{formatWorkflowRequestDateTime(item.date)}</span>
                ) : null}
              </p>
            ) : null}
            {item.comment ? (
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
                {item.comment}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
