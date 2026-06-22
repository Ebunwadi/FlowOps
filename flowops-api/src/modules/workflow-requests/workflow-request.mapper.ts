import type {
  Prisma,
  WorkflowFieldType,
  WorkflowRequestStatus,
} from "../../generated/prisma/client";

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

export function toWorkflowRequestListItem(request: {
  id: string;
  title: string | null;
  status: WorkflowRequestStatus;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  workflowTemplate: { id: string; name: string };
  requester: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
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
    requester: {
      id: request.requester.id,
      firstName: request.requester.firstName,
      lastName: request.requester.lastName,
      email: request.requester.email,
    },
    currentStep: request.currentStep
      ? { id: request.currentStep.id, name: request.currentStep.name }
      : null,
    submittedAt: request.submittedAt ? request.submittedAt.toISOString() : null,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

export interface WorkflowRequestValueDetail {
  workflowFieldId: string;
  fieldKey: string;
  label: string;
  fieldType: WorkflowFieldType;
  value: Prisma.JsonValue;
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
  history: never[];
}

interface WorkflowRequestDetailRecord {
  id: string;
  organisationId: string;
  title: string | null;
  status: WorkflowRequestStatus;
  submittedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  requester: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  workflowTemplate: {
    id: string;
    name: string;
    category: string | null;
    steps: Array<{
      id: string;
      name: string;
      description: string | null;
      stepOrder: number;
      slaHours: number | null;
      allowDelegation: boolean;
      approverRole: { id: string; name: string };
    }>;
  };
  currentStep: { id: string; name: string; stepOrder: number } | null;
  values: Array<{
    workflowFieldId: string;
    value: Prisma.JsonValue;
    workflowField: {
      fieldKey: string;
      label: string;
      fieldType: WorkflowFieldType;
    };
  }>;
}

export function toWorkflowRequestDetailResponse(
  request: WorkflowRequestDetailRecord,
): WorkflowRequestDetailResponse {
  return {
    id: request.id,
    organisationId: request.organisationId,
    title: request.title,
    status: request.status,
    workflowTemplate: {
      id: request.workflowTemplate.id,
      name: request.workflowTemplate.name,
      category: request.workflowTemplate.category,
    },
    requester: {
      id: request.requester.id,
      firstName: request.requester.firstName,
      lastName: request.requester.lastName,
      email: request.requester.email,
    },
    currentStep: request.currentStep
      ? {
          id: request.currentStep.id,
          name: request.currentStep.name,
          stepOrder: request.currentStep.stepOrder,
        }
      : null,
    values: request.values.map((value) => ({
      workflowFieldId: value.workflowFieldId,
      fieldKey: value.workflowField.fieldKey,
      label: value.workflowField.label,
      fieldType: value.workflowField.fieldType,
      value: value.value,
    })),
    approvalSteps: request.workflowTemplate.steps.map((step) => ({
      id: step.id,
      name: step.name,
      description: step.description,
      stepOrder: step.stepOrder,
      slaHours: step.slaHours,
      allowDelegation: step.allowDelegation,
      approverRole: {
        id: step.approverRole.id,
        name: step.approverRole.name,
      },
      isCurrent: request.currentStep?.id === step.id,
    })),
    submittedAt: request.submittedAt ? request.submittedAt.toISOString() : null,
    completedAt: request.completedAt ? request.completedAt.toISOString() : null,
    cancelledAt: request.cancelledAt ? request.cancelledAt.toISOString() : null,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    attachments: [],
    history: [],
  };
}

export interface CancelledWorkflowRequestResponse {
  id: string;
  title: string | null;
  status: WorkflowRequestStatus;
  cancelledAt: string | null;
}

export function toCancelledWorkflowRequestResponse(request: {
  id: string;
  title: string | null;
  status: WorkflowRequestStatus;
  cancelledAt: Date | null;
}): CancelledWorkflowRequestResponse {
  return {
    id: request.id,
    title: request.title,
    status: request.status,
    cancelledAt: request.cancelledAt ? request.cancelledAt.toISOString() : null,
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
