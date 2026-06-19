import { apiClient } from "@/api/client";
import type {
  CreatedWorkflowTemplateSummary,
  PaginatedWorkflowTemplatesResponse,
  WorkflowTemplateDetail,
  WorkflowTemplateStatus,
  WorkflowTemplateStatusResponse,
} from "@/types/workflow-template";

export interface ListWorkflowTemplatesParams {
  search?: string;
  status?: WorkflowTemplateStatus;
  category?: string;
  page?: number;
  limit?: number;
}

function buildQueryString(params: ListWorkflowTemplatesParams): string {
  const searchParams = new URLSearchParams();

  if (params.search) {
    searchParams.set("search", params.search);
  }

  if (params.status) {
    searchParams.set("status", params.status);
  }

  if (params.category) {
    searchParams.set("category", params.category);
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

export function listWorkflowTemplates(
  params: ListWorkflowTemplatesParams = {},
): Promise<PaginatedWorkflowTemplatesResponse> {
  return apiClient<PaginatedWorkflowTemplatesResponse>(
    `/workflow-templates${buildQueryString(params)}`,
  );
}

export function activateWorkflowTemplate(
  workflowTemplateId: string,
): Promise<WorkflowTemplateStatusResponse> {
  return apiClient<WorkflowTemplateStatusResponse>(
    `/workflow-templates/${workflowTemplateId}/activate`,
    { method: "PATCH" },
  );
}

export function deactivateWorkflowTemplate(
  workflowTemplateId: string,
): Promise<WorkflowTemplateStatusResponse> {
  return apiClient<WorkflowTemplateStatusResponse>(
    `/workflow-templates/${workflowTemplateId}/deactivate`,
    { method: "PATCH" },
  );
}

export function archiveWorkflowTemplate(
  workflowTemplateId: string,
): Promise<WorkflowTemplateStatusResponse> {
  return apiClient<WorkflowTemplateStatusResponse>(
    `/workflow-templates/${workflowTemplateId}/archive`,
    { method: "PATCH" },
  );
}

export function getWorkflowTemplateById(
  workflowTemplateId: string,
): Promise<WorkflowTemplateDetail> {
  return apiClient<WorkflowTemplateDetail>(`/workflow-templates/${workflowTemplateId}`);
}

export function createWorkflowTemplate(
  body: unknown,
): Promise<CreatedWorkflowTemplateSummary> {
  return apiClient<CreatedWorkflowTemplateSummary>("/workflow-templates", {
    method: "POST",
    body,
  });
}
