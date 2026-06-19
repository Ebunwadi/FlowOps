export const WORKFLOW_TEMPLATE_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
] as const;

export type WorkflowTemplateStatus = (typeof WORKFLOW_TEMPLATE_STATUSES)[number];

export interface WorkflowTemplateListItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  status: WorkflowTemplateStatus;
  isActive: boolean;
  fieldsCount: number;
  stepsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowTemplateStatusResponse {
  id: string;
  name: string;
  status: WorkflowTemplateStatus;
  isActive: boolean;
}

export interface PaginatedWorkflowTemplatesResponse {
  items: WorkflowTemplateListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_LABELS: Record<WorkflowTemplateStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ARCHIVED: "Archived",
};

export function formatWorkflowTemplateStatus(status: WorkflowTemplateStatus): string {
  return STATUS_LABELS[status];
}

export function formatWorkflowTemplateDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
