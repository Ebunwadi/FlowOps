import type { WorkflowFieldType } from "@/types/workflow-template";

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

export interface UpdateDraftWorkflowRequestBody {
  title?: string;
  values?: SubmittedRequestValueInput[];
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

export interface WorkflowRequestValueDetail {
  workflowFieldId: string;
  fieldKey: string;
  label: string;
  fieldType: WorkflowFieldType;
  value: unknown;
}

export interface WorkflowRequestApprovalStepDetail {
  id: string;
  name: string;
  description: string | null;
  stepOrder: number;
  slaHours: number | null;
  allowDelegation: boolean;
  approverRole: { id: string; name: string };
  isCurrent: boolean;
}

export interface WorkflowRequestApprovalHistoryItem {
  id: string;
  step: { id: string; name: string; stepOrder: number };
  approver: WorkflowRequestRequesterSummary;
  decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
  comment: string | null;
  decidedAt: string;
}

export type WorkflowRequestTimelineStatus =
  | "APPROVED"
  | "REJECTED"
  | "CHANGES_REQUESTED"
  | "CURRENT"
  | "WAITING"
  | "SKIPPED";

export interface WorkflowRequestTimelineItem {
  stepId: string;
  stepName: string;
  stepOrder: number;
  status: WorkflowRequestTimelineStatus;
  actor: string | null;
  date: string | null;
  comment: string | null;
}

export interface WorkflowRequestCommentResponse {
  id: string;
  content: string;
  author: WorkflowRequestRequesterSummary;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRequestDetailResponse {
  id: string;
  organisationId: string;
  title: string | null;
  status: WorkflowRequestStatus;
  workflowTemplate: { id: string; name: string; category: string | null };
  requester: WorkflowRequestRequesterSummary;
  currentStep: { id: string; name: string; stepOrder: number } | null;
  values: WorkflowRequestValueDetail[];
  approvalSteps: WorkflowRequestApprovalStepDetail[];
  submittedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  attachments: never[];
  approvalHistory: WorkflowRequestApprovalHistoryItem[];
  timeline: WorkflowRequestTimelineItem[];
  comments: WorkflowRequestCommentResponse[];
}

export interface CancelledWorkflowRequestResponse {
  id: string;
  title: string | null;
  status: WorkflowRequestStatus;
  cancelledAt: string | null;
}

const CANCELLABLE_STATUSES: readonly WorkflowRequestStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "PENDING_APPROVAL",
];

export function isCancellableStatus(status: WorkflowRequestStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status);
}

const STATUS_LABELS: Record<WorkflowRequestStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  PENDING_APPROVAL: "Pending approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CHANGES_REQUESTED: "Changes requested",
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

export function formatWorkflowRequestDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatWorkflowRequestValue(
  fieldType: WorkflowFieldType,
  value: unknown,
): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (Array.isArray(value)) {
    return value.length === 0 ? "—" : value.map((entry) => String(entry)).join(", ");
  }

  if (fieldType === "DATE" && typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? value : formatWorkflowRequestDate(value);
  }

  return String(value);
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
