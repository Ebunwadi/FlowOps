import { cn } from "@/lib/utils";
import {
  formatWorkflowRequestStatus,
  type WorkflowRequestStatus,
} from "@/types/workflow-request";

const statusStyles: Record<WorkflowRequestStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SUBMITTED: "bg-blue-50 text-blue-700",
  PENDING_APPROVAL: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
  CHANGES_REQUESTED: "bg-orange-50 text-orange-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

interface WorkflowRequestStatusBadgeProps {
  status: WorkflowRequestStatus;
}

export function WorkflowRequestStatusBadge({
  status,
}: WorkflowRequestStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status],
      )}
    >
      {formatWorkflowRequestStatus(status)}
    </span>
  );
}
