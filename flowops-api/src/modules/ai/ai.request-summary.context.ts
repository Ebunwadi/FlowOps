import type { Prisma } from "../../generated/prisma/client";
import type { findWorkflowRequestDetail } from "../workflow-requests/workflow-request.repository";

type WorkflowRequestSummarySource = NonNullable<
  Awaited<ReturnType<typeof findWorkflowRequestDetail>>
>;

function formatPersonName(person: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const parts = [person.firstName, person.lastName].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(" ");
  }

  return person.email;
}

function formatSubmittedValue(value: Prisma.JsonValue): string {
  if (value === null || value === undefined) {
    return "Not provided";
  }

  if (typeof value === "string") {
    return value.trim() || "Not provided";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function formatStatusLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildWorkflowRequestSummaryContext(
  request: WorkflowRequestSummarySource,
): string {
  const requesterName = formatPersonName(request.requester);
  const totalSteps = request.workflowTemplate.steps.length;
  const currentStep = request.currentStep;
  const currentStepLabel = currentStep
    ? `${currentStep.name} (step ${currentStep.stepOrder} of ${totalSteps})`
    : "None";

  const submittedValues =
    request.values.length === 0
      ? ["- No submitted values recorded"]
      : request.values.map(
          (entry) =>
            `- ${entry.workflowField.label}: ${formatSubmittedValue(entry.value)}`,
        );

  const approvalHistory =
    request.approvals.length === 0
      ? ["- No approval decisions recorded yet"]
      : request.approvals.map((approval) => {
          const approverName = formatPersonName(approval.approver);
          const comment = approval.comment?.trim()
            ? ` Comment: ${approval.comment.trim()}`
            : "";

          return `- ${approval.workflowStep.name}: ${approval.decision} by ${approverName} on ${approval.decidedAt.toISOString()}${comment}`;
        });

  const comments =
    request.comments.length === 0
      ? ["- No comments"]
      : request.comments.map((comment) => {
          const authorName = formatPersonName(comment.author);
          return `- ${authorName} (${comment.createdAt.toISOString()}): ${comment.content.trim()}`;
        });

  const approvalSteps = request.workflowTemplate.steps.map((step) => {
    const isCurrent = currentStep?.id === step.id;
    const completedApproval = request.approvals.find(
      (approval) => approval.workflowStep.id === step.id,
    );

    let state = "pending";
    if (completedApproval) {
      state = completedApproval.decision.toLowerCase();
    } else if (isCurrent) {
      state = "current";
    }

    return `- Step ${step.stepOrder}: ${step.name} (${step.approverRole.name}) — ${state}`;
  });

  return [
    `Workflow: ${request.workflowTemplate.name}`,
    `Request title: ${request.title ?? "Untitled request"}`,
    `Status: ${formatStatusLabel(request.status)}`,
    `Requester: ${requesterName} (${request.requester.email})`,
    `Submitted at: ${request.submittedAt?.toISOString() ?? "Not submitted"}`,
    `Current step: ${currentStepLabel}`,
    "",
    "Submitted values:",
    ...submittedValues,
    "",
    "Approval history:",
    ...approvalHistory,
    "",
    "Comments:",
    ...comments,
    "",
    "Approval steps overview:",
    ...approvalSteps,
  ].join("\n");
}

export function extractSummaryContextField(
  context: string,
  label: string,
): string | null {
  const pattern = new RegExp(`^${label}:\\s*(.+)$`, "im");
  const match = context.match(pattern);
  return match?.[1]?.trim() ?? null;
}
