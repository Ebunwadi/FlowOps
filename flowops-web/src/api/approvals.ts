import { apiClient } from "@/api/client";
import type {
  ListPendingApprovalsParams,
  PaginatedPendingApprovalsResponse,
} from "@/types/approval";
import type { SubmittedWorkflowRequestResponse } from "@/types/workflow-request";

function buildQueryString(params: ListPendingApprovalsParams): string {
  const searchParams = new URLSearchParams();

  if (params.search) {
    searchParams.set("search", params.search);
  }

  if (params.page !== undefined) {
    searchParams.set("page", String(params.page));
  }

  if (params.limit !== undefined) {
    searchParams.set("limit", String(params.limit));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function listPendingApprovals(
  params: ListPendingApprovalsParams = {},
): Promise<PaginatedPendingApprovalsResponse> {
  return apiClient<PaginatedPendingApprovalsResponse>(
    `/approvals/pending${buildQueryString(params)}`,
  );
}

export function approveWorkflowRequest(
  workflowRequestId: string,
  body: { comment?: string } = {},
): Promise<SubmittedWorkflowRequestResponse> {
  return apiClient<SubmittedWorkflowRequestResponse>(
    `/workflow-requests/${workflowRequestId}/approve`,
    { method: "POST", body },
  );
}

export function rejectWorkflowRequest(
  workflowRequestId: string,
  body: { comment: string },
): Promise<SubmittedWorkflowRequestResponse> {
  return apiClient<SubmittedWorkflowRequestResponse>(
    `/workflow-requests/${workflowRequestId}/reject`,
    { method: "POST", body },
  );
}

export function requestChangesWorkflowRequest(
  workflowRequestId: string,
  body: { comment: string },
): Promise<SubmittedWorkflowRequestResponse> {
  return apiClient<SubmittedWorkflowRequestResponse>(
    `/workflow-requests/${workflowRequestId}/request-changes`,
    { method: "POST", body },
  );
}
