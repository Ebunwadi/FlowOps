import type { WorkflowRequestStatus } from "../../generated/prisma/client";
import type { PendingApprovalRecord } from "./approval.repository";

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

function computeDueAt(
  submittedAt: Date | null,
  slaHours: number | null,
): string | null {
  if (!submittedAt || slaHours === null || slaHours <= 0) {
    return null;
  }

  return new Date(submittedAt.getTime() + slaHours * 60 * 60 * 1000).toISOString();
}

export function toPendingApprovalListItem(
  request: PendingApprovalRecord,
): PendingApprovalListItem {
  if (!request.currentStep) {
    throw new Error("Pending approval record is missing a current step");
  }

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
    currentStep: {
      id: request.currentStep.id,
      name: request.currentStep.name,
    },
    submittedAt: request.submittedAt ? request.submittedAt.toISOString() : null,
    dueAt: computeDueAt(request.submittedAt, request.currentStep.slaHours),
  };
}
