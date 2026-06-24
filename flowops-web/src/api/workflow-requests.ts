import { apiClient } from "@/api/client";
import type {
  CancelledWorkflowRequestResponse,
  DraftWorkflowRequestResponse,
  PaginatedWorkflowRequestsResponse,
  SaveDraftWorkflowRequestBody,
  SubmittedWorkflowRequestResponse,
  SubmitWorkflowRequestBody,
  UpdateDraftWorkflowRequestBody,
  WorkflowRequestCommentResponse,
  WorkflowRequestDetailResponse,
  WorkflowRequestStatus,
} from "@/types/workflow-request";

export interface ListWorkflowRequestsParams {
  status?: WorkflowRequestStatus;
  workflowTemplateId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

function buildQueryString(params: ListWorkflowRequestsParams): string {
  const searchParams = new URLSearchParams();

  if (params.status) {
    searchParams.set("status", params.status);
  }

  if (params.workflowTemplateId) {
    searchParams.set("workflowTemplateId", params.workflowTemplateId);
  }

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

export function listMyWorkflowRequests(
  params: ListWorkflowRequestsParams = {},
): Promise<PaginatedWorkflowRequestsResponse> {
  return apiClient<PaginatedWorkflowRequestsResponse>(
    `/workflow-requests/my${buildQueryString(params)}`,
  );
}

export function listOrganisationWorkflowRequests(
  params: ListWorkflowRequestsParams = {},
): Promise<PaginatedWorkflowRequestsResponse> {
  return apiClient<PaginatedWorkflowRequestsResponse>(
    `/workflow-requests${buildQueryString(params)}`,
  );
}

export function getWorkflowRequestById(
  workflowRequestId: string,
): Promise<WorkflowRequestDetailResponse> {
  return apiClient<WorkflowRequestDetailResponse>(
    `/workflow-requests/${workflowRequestId}`,
  );
}

export function cancelWorkflowRequest(
  workflowRequestId: string,
): Promise<CancelledWorkflowRequestResponse> {
  return apiClient<CancelledWorkflowRequestResponse>(
    `/workflow-requests/${workflowRequestId}/cancel`,
    { method: "POST" },
  );
}

export function updateDraftWorkflowRequest(
  workflowRequestId: string,
  body: UpdateDraftWorkflowRequestBody,
): Promise<DraftWorkflowRequestResponse> {
  return apiClient<DraftWorkflowRequestResponse>(
    `/workflow-requests/${workflowRequestId}/draft`,
    { method: "PATCH", body },
  );
}

export function submitDraftWorkflowRequest(
  workflowRequestId: string,
): Promise<SubmittedWorkflowRequestResponse> {
  return apiClient<SubmittedWorkflowRequestResponse>(
    `/workflow-requests/${workflowRequestId}/submit`,
    { method: "POST" },
  );
}

export function submitWorkflowRequest(
  body: SubmitWorkflowRequestBody,
): Promise<SubmittedWorkflowRequestResponse> {
  return apiClient<SubmittedWorkflowRequestResponse>("/workflow-requests", {
    method: "POST",
    body,
  });
}

export function saveDraftWorkflowRequest(
  body: SaveDraftWorkflowRequestBody,
): Promise<DraftWorkflowRequestResponse> {
  return apiClient<DraftWorkflowRequestResponse>("/workflow-requests/drafts", {
    method: "POST",
    body,
  });
}

export function listWorkflowRequestComments(
  workflowRequestId: string,
): Promise<WorkflowRequestCommentResponse[]> {
  return apiClient<WorkflowRequestCommentResponse[]>(
    `/workflow-requests/${workflowRequestId}/comments`,
  );
}

export function createWorkflowRequestComment(
  workflowRequestId: string,
  body: { content: string },
): Promise<WorkflowRequestCommentResponse> {
  return apiClient<WorkflowRequestCommentResponse>(
    `/workflow-requests/${workflowRequestId}/comments`,
    { method: "POST", body },
  );
}
