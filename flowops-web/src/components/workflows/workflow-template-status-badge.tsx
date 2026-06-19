import { cn } from "@/lib/utils";
import {
  formatWorkflowTemplateStatus,
  type WorkflowTemplateStatus,
} from "@/types/workflow-template";

const statusStyles: Record<WorkflowTemplateStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  INACTIVE: "bg-amber-50 text-amber-700",
  ARCHIVED: "bg-slate-100 text-slate-500",
};

interface WorkflowTemplateStatusBadgeProps {
  status: WorkflowTemplateStatus;
}

export function WorkflowTemplateStatusBadge({
  status,
}: WorkflowTemplateStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status],
      )}
    >
      {formatWorkflowTemplateStatus(status)}
    </span>
  );
}
