import type { ApprovalDecision, WorkflowRequestStatus } from "../../generated/prisma/client";

export const WORKFLOW_REQUEST_TIMELINE_STATUSES = [
  "APPROVED",
  "REJECTED",
  "CHANGES_REQUESTED",
  "CURRENT",
  "WAITING",
  "SKIPPED",
] as const;

export type WorkflowRequestTimelineStatus =
  (typeof WORKFLOW_REQUEST_TIMELINE_STATUSES)[number];

export interface WorkflowRequestTimelineItem {
  stepId: string;
  stepName: string;
  stepOrder: number;
  status: WorkflowRequestTimelineStatus;
  actor: string | null;
  date: string | null;
  comment: string | null;
}

interface TimelineStep {
  id: string;
  name: string;
  stepOrder: number;
}

interface TimelineApprover {
  firstName: string | null;
  lastName: string | null;
  email: string;
}

interface TimelineApproval {
  decision: ApprovalDecision;
  comment: string | null;
  decidedAt: Date;
  workflowStep: { id: string };
  approver: TimelineApprover;
}

export interface BuildWorkflowRequestTimelineInput {
  requestStatus: WorkflowRequestStatus;
  currentStepId: string | null;
  steps: TimelineStep[];
  approvals: TimelineApproval[];
}

const TERMINAL_DECISIONS = new Set<ApprovalDecision>(["REJECTED"]);

function buildLatestApprovalsByStepId(
  approvals: TimelineApproval[],
): Map<string, TimelineApproval> {
  const approvalsByStepId = new Map<string, TimelineApproval>();

  for (const approval of approvals) {
    const stepId = approval.workflowStep.id;
    const existing = approvalsByStepId.get(stepId);

    if (!existing || approval.decidedAt > existing.decidedAt) {
      approvalsByStepId.set(stepId, approval);
    }
  }

  return approvalsByStepId;
}

function formatTimelineActor(approver: TimelineApprover): string {
  const name = [approver.firstName, approver.lastName]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ")
    .trim();

  return name === "" ? approver.email : name;
}

function buildWaitingTimelineItem(step: TimelineStep): WorkflowRequestTimelineItem {
  return {
    stepId: step.id,
    stepName: step.name,
    stepOrder: step.stepOrder,
    status: "WAITING",
    actor: null,
    date: null,
    comment: null,
  };
}

function buildSkippedTimelineItem(step: TimelineStep): WorkflowRequestTimelineItem {
  return {
    stepId: step.id,
    stepName: step.name,
    stepOrder: step.stepOrder,
    status: "SKIPPED",
    actor: null,
    date: null,
    comment: null,
  };
}

export function buildWorkflowRequestTimeline(
  input: BuildWorkflowRequestTimelineInput,
): WorkflowRequestTimelineItem[] {
  const sortedSteps = [...input.steps].sort((left, right) => left.stepOrder - right.stepOrder);
  const approvalsByStepId = buildLatestApprovalsByStepId(input.approvals);

  let stopAfterStepOrder: number | null = null;

  for (const step of sortedSteps) {
    const approval = approvalsByStepId.get(step.id);

    if (approval && TERMINAL_DECISIONS.has(approval.decision)) {
      stopAfterStepOrder = step.stepOrder;
      break;
    }
  }

  const currentStepOrder =
    input.currentStepId === null
      ? null
      : (sortedSteps.find((step) => step.id === input.currentStepId)?.stepOrder ?? null);

  return sortedSteps.map((step) => {
    const approval = approvalsByStepId.get(step.id);

    if (
      input.requestStatus === "PENDING_APPROVAL" &&
      step.id === input.currentStepId &&
      (!approval || approval.decision === "CHANGES_REQUESTED")
    ) {
      return {
        stepId: step.id,
        stepName: step.name,
        stepOrder: step.stepOrder,
        status: "CURRENT",
        actor: null,
        date: null,
        comment: null,
      };
    }

    if (approval) {
      return {
        stepId: step.id,
        stepName: step.name,
        stepOrder: step.stepOrder,
        status: approval.decision,
        actor: formatTimelineActor(approval.approver),
        date: approval.decidedAt.toISOString(),
        comment: approval.comment,
      };
    }

    if (stopAfterStepOrder !== null && step.stepOrder > stopAfterStepOrder) {
      return buildSkippedTimelineItem(step);
    }

    if (input.requestStatus === "DRAFT") {
      return buildWaitingTimelineItem(step);
    }

    if (
      input.requestStatus === "PENDING_APPROVAL" &&
      currentStepOrder !== null &&
      step.stepOrder > currentStepOrder
    ) {
      return buildWaitingTimelineItem(step);
    }

    if (
      input.requestStatus === "CHANGES_REQUESTED" &&
      currentStepOrder !== null &&
      step.stepOrder > currentStepOrder
    ) {
      return buildWaitingTimelineItem(step);
    }

    if (
      input.requestStatus === "CANCELLED" ||
      input.requestStatus === "APPROVED" ||
      input.requestStatus === "REJECTED"
    ) {
      return buildSkippedTimelineItem(step);
    }

    if (input.requestStatus === "CHANGES_REQUESTED") {
      return buildWaitingTimelineItem(step);
    }

    return buildWaitingTimelineItem(step);
  });
}
