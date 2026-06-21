import type { WorkflowRequestStatus } from "../../generated/prisma/client";

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
