import { cn } from "@/lib/utils";
import {
  formatRequesterName,
  formatWorkflowRequestDateTime,
  type WorkflowRequestApprovalHistoryItem,
} from "@/types/workflow-request";

const DECISION_LABELS: Record<
  WorkflowRequestApprovalHistoryItem["decision"],
  string
> = {
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CHANGES_REQUESTED: "Changes requested",
};

const DECISION_BADGE_STYLES: Record<
  WorkflowRequestApprovalHistoryItem["decision"],
  string
> = {
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
  CHANGES_REQUESTED: "bg-orange-50 text-orange-700",
};

export function RequestApprovalHistory({
  items,
}: {
  items: WorkflowRequestApprovalHistoryItem[];
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No approval decisions have been recorded yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((entry) => (
        <li key={entry.id} className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{entry.step.name}</p>
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                DECISION_BADGE_STYLES[entry.decision],
              )}
            >
              {DECISION_LABELS[entry.decision]}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatRequesterName(entry.approver)}
            <span className="mx-1">·</span>
            {formatWorkflowRequestDateTime(entry.decidedAt)}
          </p>
          {entry.comment ? (
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">
              {entry.comment}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
