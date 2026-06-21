import type { Prisma, WorkflowRequestStatus } from "../../generated/prisma/client";

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

export function toSubmittedWorkflowRequestResponse(request: {
  id: string;
  title: string | null;
  status: WorkflowRequestStatus;
  submittedAt: Date | null;
  currentStep: { id: string; name: string } | null;
}): SubmittedWorkflowRequestResponse {
  return {
    id: request.id,
    title: request.title,
    status: request.status,
    currentStep: request.currentStep
      ? { id: request.currentStep.id, name: request.currentStep.name }
      : null,
    submittedAt: request.submittedAt ? request.submittedAt.toISOString() : null,
  };
}

export interface WorkflowRequestListItem {
  id: string;
  title: string | null;
  status: WorkflowRequestStatus;
  workflowTemplate: { id: string; name: string };
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

export function toWorkflowRequestListItem(request: {
  id: string;
  title: string | null;
  status: WorkflowRequestStatus;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  workflowTemplate: { id: string; name: string };
  currentStep: { id: string; name: string } | null;
}): WorkflowRequestListItem {
  return {
    id: request.id,
    title: request.title,
    status: request.status,
    workflowTemplate: {
      id: request.workflowTemplate.id,
      name: request.workflowTemplate.name,
    },
    currentStep: request.currentStep
      ? { id: request.currentStep.id, name: request.currentStep.name }
      : null,
    submittedAt: request.submittedAt ? request.submittedAt.toISOString() : null,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

export interface WorkflowRequestValueResponse {
  workflowFieldId: string;
  value: Prisma.JsonValue;
}

export interface DraftWorkflowRequestResponse {
  id: string;
  workflowTemplateId: string;
  title: string | null;
  status: WorkflowRequestStatus;
  values: WorkflowRequestValueResponse[];
  createdAt: string;
  updatedAt: string;
}

export function toDraftWorkflowRequestResponse(request: {
  id: string;
  workflowTemplateId: string;
  title: string | null;
  status: WorkflowRequestStatus;
  createdAt: Date;
  updatedAt: Date;
  values: Array<{ workflowFieldId: string; value: Prisma.JsonValue }>;
}): DraftWorkflowRequestResponse {
  return {
    id: request.id,
    workflowTemplateId: request.workflowTemplateId,
    title: request.title,
    status: request.status,
    values: request.values.map((value) => ({
      workflowFieldId: value.workflowFieldId,
      value: value.value,
    })),
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}
