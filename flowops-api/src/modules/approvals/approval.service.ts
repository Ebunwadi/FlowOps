import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
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
  isOrganisationOwnerRole,
} from "./approval.helpers";
import {
  buildRequestValuesByFieldKeyFromStoredValues,
  getNextEligibleWorkflowStep,
} from "./step-condition";
import {
  notifyApproversOfNextStep,
  notifyApprovalDelegated,
  notifyRequesterOfApprovedStep,
  notifyRequesterOfChangesRequested,
  notifyRequesterOfCompletedRequest,
  notifyRequesterOfRejectedRequest,
} from "./approval.notifications";
import {
  emitWorkflowRequestApprovedWebhook,
  emitWorkflowRequestCompletedWebhook,
  emitWorkflowRequestRejectedWebhook,
} from "../webhooks/webhook.emitter";
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
  findActiveOrganisationMemberByUserId,
  findApprovalDelegationForRequestStep,
  findActiveDelegatedRequestIdsForUser,
  upsertApprovalDelegationRecord,
} from "./approval-delegation.repository";
import {
  findOutOfOfficeDelegatedPendingRequestIds,
  findOutOfOfficeReassignmentsForDelegate,
  isActiveOutOfOfficeDelegateForRole,
} from "../out-of-office/out-of-office.repository";
import {
  toApprovalDelegationResponse,
  type ApprovalDelegationResponse,
} from "./approval-delegation.mapper";
import {
  toPendingApprovalListItem,
  type PaginatedPendingApprovalsResponse,
} from "./approval.mapper";
import type {
  ApproveWorkflowRequestBody,
  DelegateWorkflowRequestBody,
  ListPendingApprovalsQuery,
  RejectWorkflowRequestBody,
  RequestChangesWorkflowRequestBody,
} from "./approval.validation";

export { isOrganisationOwnerRole } from "./approval.helpers";

export interface PendingApprovalViewer {
  userId: string;
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
    const delegation = await findApprovalDelegationForRequestStep(
      request.id,
      request.currentStep.id,
    );

    if (delegation?.delegatedTo.id === actor.userId) {
      return { request, currentStep: request.currentStep };
    }

    const isOutOfOfficeDelegate = await isActiveOutOfOfficeDelegateForRole(
      organisationId,
      actor.userId,
      request.currentStep.approverRoleId,
    );

    if (!isOutOfOfficeDelegate) {
      throw new AuthorizationError(
        "You are not assigned to act on the current step of this request",
      );
    }
  }

  return { request, currentStep: request.currentStep };
}

export async function listPendingApprovals(
  organisationId: string,
  viewer: PendingApprovalViewer,
  query: ListPendingApprovalsQuery,
): Promise<PaginatedPendingApprovalsResponse> {
  const includeAllPending = isOrganisationOwnerRole(viewer.roleName);
  const [delegatedRequestIds, outOfOfficeDelegatedRequestIds] = includeAllPending
    ? [undefined, undefined]
    : await Promise.all([
        findActiveDelegatedRequestIdsForUser(organisationId, viewer.userId),
        findOutOfOfficeDelegatedPendingRequestIds(organisationId, viewer.userId),
      ]);

  const mergedDelegatedRequestIds = includeAllPending
    ? undefined
    : [
        ...new Set([
          ...(delegatedRequestIds ?? []),
          ...(outOfOfficeDelegatedRequestIds ?? []),
        ]),
      ];

  const filters = {
    approverRoleId: includeAllPending ? undefined : viewer.roleId,
    delegatedRequestIds: includeAllPending ? undefined : mergedDelegatedRequestIds,
    search: query.search,
    page: query.page,
    limit: query.limit,
  };

  const [requests, total] = await Promise.all([
    findPendingApprovals(organisationId, filters),
    countPendingApprovals(organisationId, filters),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

  let reassignmentByRequestId = new Map<
    string,
    {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
    }
  >();

  if (!includeAllPending && mergedDelegatedRequestIds && mergedDelegatedRequestIds.length > 0) {
    const visibleRequestIds = requests.map((request) => request.id);
    const reassignments = await findOutOfOfficeReassignmentsForDelegate(
      organisationId,
      viewer.userId,
      visibleRequestIds,
    );

    reassignmentByRequestId = new Map(
      reassignments.map((reassignment) => [
        reassignment.workflowRequestId,
        reassignment.outOfOfficeUser,
      ]),
    );
  }

  return {
    items: requests.map((request) =>
      toPendingApprovalListItem(request, reassignmentByRequestId.get(request.id)),
    ),
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

  const valuesByFieldKey = buildRequestValuesByFieldKeyFromStoredValues(
    request.values ?? [],
  );
  const nextStep = getNextEligibleWorkflowStep(
    request.workflowTemplate.steps,
    currentStep.id,
    valuesByFieldKey,
  );
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
    emitWorkflowRequestApprovedWebhook({
      organisationId,
      workflowRequestId: request.id,
      workflowTemplateId: request.workflowTemplateId,
      status: updatedRequest.status,
      title: request.title,
      stepId: currentStep.id,
      stepName: currentStep.name,
    });
  } else {
    notifyRequesterOfCompletedRequest({
      organisationId,
      workflowRequestId: request.id,
      workflowTemplateId: request.workflowTemplateId,
      requesterId: request.requesterId,
      requestTitle: request.title,
    });
    emitWorkflowRequestCompletedWebhook({
      organisationId,
      workflowRequestId: request.id,
      workflowTemplateId: request.workflowTemplateId,
      status: updatedRequest.status,
      title: request.title,
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

  emitWorkflowRequestRejectedWebhook({
    organisationId,
    workflowRequestId: request.id,
    workflowTemplateId: request.workflowTemplateId,
    status: updatedRequest.status,
    title: request.title,
    comment: input.comment,
    rejectedStepId: currentStep.id,
    rejectedStepName: currentStep.name,
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

function formatUserDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const parts = [user.firstName, user.lastName].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(" ");
  }

  return user.email;
}

export async function delegateWorkflowRequestApproval(
  organisationId: string,
  actor: ApprovalActor,
  workflowRequestId: string,
  input: DelegateWorkflowRequestBody,
): Promise<ApprovalDelegationResponse> {
  const request = await findWorkflowRequestForApproval(workflowRequestId, organisationId);

  if (!request) {
    throw new NotFoundError("Workflow request not found");
  }

  if (request.status !== "PENDING_APPROVAL") {
    throw new ConflictError("Only pending approval requests can be delegated");
  }

  if (!request.currentStep) {
    throw new ConflictError("This request has no current approval step");
  }

  if (!request.currentStep.allowDelegation) {
    throw new ConflictError("Delegation is not allowed for the current approval step");
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
      "You are not assigned to delegate the current step of this request",
    );
  }

  if (input.delegatedToId === actor.userId) {
    throw new ValidationError("You cannot delegate approval to yourself");
  }

  if (input.delegatedToId === request.requesterId) {
    throw new ValidationError("You cannot delegate approval to the requester");
  }

  const delegateMembership = await findActiveOrganisationMemberByUserId(
    organisationId,
    input.delegatedToId,
  );

  if (!delegateMembership) {
    throw new ValidationError("Delegated user must be an active organisation member");
  }

  const delegation = await upsertApprovalDelegationRecord({
    organisationId,
    workflowRequestId: request.id,
    workflowStepId: request.currentStep.id,
    delegatedById: actor.userId,
    delegatedToId: input.delegatedToId,
    reason: input.reason,
  });

  logger.info(
    {
      origin: "api",
      event: "workflow_request.approval_delegated",
      organisationId,
      workflowRequestId: request.id,
      workflowStepId: request.currentStep.id,
      delegatedById: actor.userId,
      delegatedToId: input.delegatedToId,
    },
    `[API] Workflow request "${request.title ?? request.id}" delegated for step "${request.currentStep.name}"`,
  );

  recordApprovalAuditEvent({
    action: APPROVAL_AUDIT_ACTIONS.DELEGATED,
    organisationId,
    actorUserId: actor.userId,
    workflowRequestId: request.id,
    metadata: {
      workflowTemplateId: request.workflowTemplateId,
      templateName: request.workflowTemplate.name,
      status: request.status,
      stepId: request.currentStep.id,
      stepName: request.currentStep.name,
      delegatedToId: input.delegatedToId,
      reason: input.reason ?? null,
    },
  });

  notifyApprovalDelegated({
    organisationId,
    workflowRequestId: request.id,
    delegatedToId: input.delegatedToId,
    delegatedByName: formatUserDisplayName(delegation.delegatedBy),
    stepName: request.currentStep.name,
    requestTitle: request.title,
  });

  return toApprovalDelegationResponse(delegation);
}
