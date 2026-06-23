export const WORKFLOW_REQUEST_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;

export type WorkflowRequestStatus = (typeof WORKFLOW_REQUEST_STATUSES)[number];

export interface SubmittedRequestValueInput {
  workflowFieldId: string;
  value: unknown;
}

export interface SubmitWorkflowRequestBody {
  workflowTemplateId: string;
  title?: string;
  values: SubmittedRequestValueInput[];
}

export interface SaveDraftWorkflowRequestBody {
  workflowTemplateId: string;
  title?: string;
  values: SubmittedRequestValueInput[];
}

export interface WorkflowRequestStepSummary {
  id: string;
  name: string;
}

export interface SubmittedWorkflowRequestResponse {
  id: string;
  title: string | null;
  status: WorkflowRequestStatus;
  currentStep: WorkflowRequestStepSummary | null;
  submittedAt: string | null;
}

export interface DraftWorkflowRequestResponse {
  id: string;
  workflowTemplateId: string;
  title: string | null;
  status: WorkflowRequestStatus;
  values: Array<{ workflowFieldId: string; value: unknown }>;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRequestRequesterSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export interface WorkflowRequestListItem {
  id: string;
  title: string | null;
  status: WorkflowRequestStatus;
  workflowTemplate: { id: string; name: string };
  requester: WorkflowRequestRequesterSummary;
  currentStep: WorkflowRequestStepSummary | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedWorkflowRequestsResponse {
  items: WorkflowRequestListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_LABELS: Record<WorkflowRequestStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  PENDING_APPROVAL: "Pending approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export function formatWorkflowRequestStatus(status: WorkflowRequestStatus): string {
  return STATUS_LABELS[status];
}

export function formatWorkflowRequestDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatRequesterName(
  requester: WorkflowRequestRequesterSummary,
): string {
  const name = [requester.firstName, requester.lastName]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ")
    .trim();
  return name === "" ? requester.email : name;
}
