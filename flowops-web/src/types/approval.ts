import type { WorkflowRequestStatus } from "@/types/workflow-request";

export interface PendingApprovalRequesterSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export interface PendingApprovalStepSummary {
  id: string;
  name: string;
}

export interface PendingApprovalListItem {
  id: string;
  title: string | null;
  status: WorkflowRequestStatus;
  workflowTemplate: { id: string; name: string };
  requester: PendingApprovalRequesterSummary;
  currentStep: PendingApprovalStepSummary;
  submittedAt: string | null;
  dueAt: string | null;
}

export interface PaginatedPendingApprovalsResponse {
  items: PendingApprovalListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListPendingApprovalsParams {
  search?: string;
  page?: number;
  limit?: number;
}
