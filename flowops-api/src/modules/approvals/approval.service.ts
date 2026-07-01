import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
} from "../../common/errors/httpErrors";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import {
  toSubmittedWorkflowRequestResponse,
  type SubmittedWorkflowRequestResponse,
} from "../workflow-requests/workflow-request.mapper";
import { APPROVAL_AUDIT_ACTIONS, recordApprovalAuditEvent } from "./approval.audit";
import {
  canActAsCurrentApprover,
  getNextWorkflowStep,
  isOrganisationOwnerRole,
} from "./approval.helpers";
import {
  notifyApproversOfNextStep,
  notifyRequesterOfApprovedStep,
  notifyRequesterOfChangesRequested,
  notifyRequesterOfCompletedRequest,
  notifyRequesterOfRejectedRequest,
} from "./approval.notifications";
import {
  applyWorkflowRequestApproval,
  applyWorkflowRequestChangesRequested,
  applyWorkflowRequestRejection,
  countPendingApprovals,
  createApprovalDecision,
  findBlockingApprovalDecisionForStep,
  findPendingApprovals,
  findWorkflowRequestForApproval,
} from "./approval.repository";
import {
  toPendingApprovalListItem,
  type PaginatedPendingApprovalsResponse,
} from "./approval.mapper";
import type {
  ApproveWorkflowRequestBody,
  ListPendingApprovalsQuery,
  RejectWorkflowRequestBody,
  RequestChangesWorkflowRequestBody,
} from "./approval.validation";

export { isOrganisationOwnerRole } from "./approval.helpers";

export interface PendingApprovalViewer {
  roleId: string;
  roleName: string;
}

export interface ApprovalActor {
  userId: string;
  roleId: string;
  roleName: string;
}

type WorkflowRequestForApproval = NonNullable<
  Awaited<ReturnType<typeof findWorkflowRequestForApproval>>
>;

async function loadApprovalDecisionContext(
  organisationId: string,
  actor: ApprovalActor,
  workflowRequestId: string,
  pendingActionMessage: string,
): Promise<{
  request: WorkflowRequestForApproval;
  currentStep: NonNullable<WorkflowRequestForApproval["currentStep"]>;
}> {
  const request = await findWorkflowRequestForApproval(
    workflowRequestId,
    organisationId,
  );

  if (!request) {
    throw new NotFoundError("Workflow request not found");
  }

  if (request.status !== "PENDING_APPROVAL") {
    throw new ConflictError(pendingActionMessage);
  }

  if (!request.currentStep) {
    throw new ConflictError("This request has no current approval step");
  }

  const existingDecision = await findBlockingApprovalDecisionForStep(
    request.id,
    request.currentStep.id,
    request.status,
  );

  if (existingDecision) {
    throw new ConflictError("This approval step has already been decided");
  }

  if (!canActAsCurrentApprover(actor, request.currentStep.approverRoleId)) {
    throw new AuthorizationError(
      "You are not assigned to act on the current step of this request",
    );
  }

  return { request, currentStep: request.currentStep };
}

export async function listPendingApprovals(
  organisationId: string,
  viewer: PendingApprovalViewer,
  query: ListPendingApprovalsQuery,
): Promise<PaginatedPendingApprovalsResponse> {
  const includeAllPending = isOrganisationOwnerRole(viewer.roleName);

  const filters = {
    approverRoleId: includeAllPending ? undefined : viewer.roleId,
    search: query.search,
    page: query.page,
    limit: query.limit,
  };

  const [requests, total] = await Promise.all([
    findPendingApprovals(organisationId, filters),
    countPendingApprovals(organisationId, filters),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

  return {
    items: requests.map(toPendingApprovalListItem),
    page: query.page,
    limit: query.limit,
    total,
    totalPages,
  };
}

export async function approveWorkflowRequest(
  organisationId: string,
  actor: ApprovalActor,
  workflowRequestId: string,
  input: ApproveWorkflowRequestBody,
): Promise<SubmittedWorkflowRequestResponse> {
  const { request, currentStep } = await loadApprovalDecisionContext(
    organisationId,
    actor,
    workflowRequestId,
    "Only pending approval requests can be approved",
  );

  const nextStep = getNextWorkflowStep(request.workflowTemplate.steps, currentStep.id);
  const completedAt = nextStep ? null : new Date();

  const updatedRequest = await prisma.$transaction(async (tx) => {
    await createApprovalDecision(
      {
        workflowRequestId: request.id,
        workflowStepId: currentStep.id,
        approverId: actor.userId,
        decision: "APPROVED",
        comment: input.comment,
      },
      tx,
    );

    return applyWorkflowRequestApproval(
      {
        workflowRequestId: request.id,
        nextStepId: nextStep?.id ?? null,
        status: nextStep ? "PENDING_APPROVAL" : "APPROVED",
        completedAt,
      },
      tx,
    );
  });

  logger.info(
    {
      origin: "api",
      event: nextStep ? "workflow_request.step_approved" : "workflow_request.completed",
      organisationId,
      workflowRequestId: request.id,
      workflowTemplateId: request.workflowTemplateId,
      approverId: actor.userId,
      approvedStepId: currentStep.id,
      nextStepId: nextStep?.id ?? null,
    },
    nextStep
      ? `[API] Workflow request "${request.title ?? request.id}" advanced to step "${nextStep.name}"`
      : `[API] Workflow request "${request.title ?? request.id}" completed`,
  );

  recordApprovalAuditEvent({
    action: nextStep
      ? APPROVAL_AUDIT_ACTIONS.STEP_APPROVED
      : APPROVAL_AUDIT_ACTIONS.COMPLETED,
    organisationId,
    actorUserId: actor.userId,
    workflowRequestId: request.id,
    metadata: {
      workflowTemplateId: request.workflowTemplateId,
      templateName: request.workflowTemplate.name,
      status: updatedRequest.status,
      approvedStepId: currentStep.id,
      approvedStepName: currentStep.name,
      nextStepId: nextStep?.id ?? null,
      comment: input.comment ?? null,
    },
  });

  if (nextStep) {
    notifyApproversOfNextStep({
      organisationId,
      workflowRequestId: request.id,
      workflowTemplateId: request.workflowTemplateId,
      stepId: nextStep.id,
      approverRoleId: nextStep.approverRoleId,
      stepName: nextStep.name,
      requestTitle: request.title,
      workflowName: request.workflowTemplate.name,
    });
    notifyRequesterOfApprovedStep({
      organisationId,
      workflowRequestId: request.id,
      workflowTemplateId: request.workflowTemplateId,
      requesterId: request.requesterId,
      approvedStepName: currentStep.name,
      nextStepName: nextStep.name,
      requestTitle: request.title,
    });
  } else {
    notifyRequesterOfCompletedRequest({
      organisationId,
      workflowRequestId: request.id,
      workflowTemplateId: request.workflowTemplateId,
      requesterId: request.requesterId,
      requestTitle: request.title,
    });
  }

  return toSubmittedWorkflowRequestResponse(updatedRequest);
}

export async function rejectWorkflowRequest(
  organisationId: string,
  actor: ApprovalActor,
  workflowRequestId: string,
  input: RejectWorkflowRequestBody,
): Promise<SubmittedWorkflowRequestResponse> {
  const { request, currentStep } = await loadApprovalDecisionContext(
    organisationId,
    actor,
    workflowRequestId,
    "Only pending approval requests can be rejected",
  );

  const updatedRequest = await prisma.$transaction(async (tx) => {
    await createApprovalDecision(
      {
        workflowRequestId: request.id,
        workflowStepId: currentStep.id,
        approverId: actor.userId,
        decision: "REJECTED",
        comment: input.comment,
      },
      tx,
    );

    return applyWorkflowRequestRejection(request.id, tx);
  });

  logger.info(
    {
      origin: "api",
      event: "workflow_request.rejected",
      organisationId,
      workflowRequestId: request.id,
      workflowTemplateId: request.workflowTemplateId,
      approverId: actor.userId,
      rejectedStepId: currentStep.id,
    },
    `[API] Workflow request "${request.title ?? request.id}" rejected`,
  );

  recordApprovalAuditEvent({
    action: APPROVAL_AUDIT_ACTIONS.REJECTED,
    organisationId,
    actorUserId: actor.userId,
    workflowRequestId: request.id,
    metadata: {
      workflowTemplateId: request.workflowTemplateId,
      templateName: request.workflowTemplate.name,
      status: updatedRequest.status,
      rejectedStepId: currentStep.id,
      rejectedStepName: currentStep.name,
      comment: input.comment,
    },
  });

  notifyRequesterOfRejectedRequest({
    organisationId,
    workflowRequestId: request.id,
    workflowTemplateId: request.workflowTemplateId,
    requesterId: request.requesterId,
    comment: input.comment,
    requestTitle: request.title,
  });

  return toSubmittedWorkflowRequestResponse(updatedRequest);
}

export async function requestChangesWorkflowRequest(
  organisationId: string,
  actor: ApprovalActor,
  workflowRequestId: string,
  input: RequestChangesWorkflowRequestBody,
): Promise<SubmittedWorkflowRequestResponse> {
  const { request, currentStep } = await loadApprovalDecisionContext(
    organisationId,
    actor,
    workflowRequestId,
    "Only pending approval requests can have changes requested",
  );

  const updatedRequest = await prisma.$transaction(async (tx) => {
    await createApprovalDecision(
      {
        workflowRequestId: request.id,
        workflowStepId: currentStep.id,
        approverId: actor.userId,
        decision: "CHANGES_REQUESTED",
        comment: input.comment,
      },
      tx,
    );

    return applyWorkflowRequestChangesRequested(request.id, tx);
  });

  logger.info(
    {
      origin: "api",
      event: "workflow_request.changes_requested",
      organisationId,
      workflowRequestId: request.id,
      workflowTemplateId: request.workflowTemplateId,
      approverId: actor.userId,
      stepId: currentStep.id,
    },
    `[API] Workflow request "${request.title ?? request.id}" changes requested`,
  );

  recordApprovalAuditEvent({
    action: APPROVAL_AUDIT_ACTIONS.CHANGES_REQUESTED,
    organisationId,
    actorUserId: actor.userId,
    workflowRequestId: request.id,
    metadata: {
      workflowTemplateId: request.workflowTemplateId,
      templateName: request.workflowTemplate.name,
      status: updatedRequest.status,
      stepId: currentStep.id,
      stepName: currentStep.name,
      comment: input.comment,
    },
  });

  notifyRequesterOfChangesRequested({
    organisationId,
    workflowRequestId: request.id,
    workflowTemplateId: request.workflowTemplateId,
    requesterId: request.requesterId,
    comment: input.comment,
    requestTitle: request.title,
  });

  return toSubmittedWorkflowRequestResponse(updatedRequest);
}
