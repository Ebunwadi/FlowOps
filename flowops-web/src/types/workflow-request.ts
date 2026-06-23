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
