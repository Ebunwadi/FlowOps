import { findLatestChangesRequestedStepId } from "../approvals/approval.repository";
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../common/errors/httpErrors";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import {
  recordWorkflowRequestAuditEvent,
  WORKFLOW_REQUEST_AUDIT_ACTIONS,
} from "./workflow-request.audit";
import {
  viewerCanAccessWorkflowRequest,
  type WorkflowRequestViewer,
} from "./workflow-request.access";
import {
  toCancelledWorkflowRequestResponse,
  toDraftWorkflowRequestResponse,
  toSubmittedWorkflowRequestResponse,
  toWorkflowRequestDetailResponse,
  toWorkflowRequestListItem,
  type CancelledWorkflowRequestResponse,
  type DraftWorkflowRequestResponse,
  type PaginatedWorkflowRequestsResponse,
  type SubmittedWorkflowRequestResponse,
  type WorkflowRequestDetailResponse,
} from "./workflow-request.mapper";
import { notifyApproversOfPendingRequest } from "./workflow-request.notifications";
import {
  countWorkflowRequests,
  createDraftWorkflowRequestRecord,
  createWorkflowRequestWithValues,
  findTemplateForRequestSubmission,
  findWorkflowRequestDetail,
  findWorkflowRequestForMutation,
  findWorkflowRequests,
  markWorkflowRequestCancelled,
  resubmitChangesRequestedWorkflowRequestRecord,
  submitDraftWorkflowRequestRecord,
  updateDraftWorkflowRequestRecord,
} from "./workflow-request.repository";
import type {
  ListWorkflowRequestsQuery,
  SaveDraftWorkflowRequestBody,
  SubmittedRequestValue,
  SubmitWorkflowRequestBody,
  UpdateDraftWorkflowRequestBody,
} from "./workflow-request.validation";
import {
  validateRequestValues,
  type ValidatedRequestValue,
} from "./workflow-request.validator";

type TemplateForSubmission = NonNullable<
  Awaited<ReturnType<typeof findTemplateForRequestSubmission>>
>;

async function loadTemplateForRequestOrThrow(
  workflowTemplateId: string,
  organisationId: string,
): Promise<TemplateForSubmission> {
  const template = await findTemplateForRequestSubmission(
    workflowTemplateId,
    organisationId,
  );

  if (!template) {
    throw new NotFoundError("Workflow template not found");
  }

  return template;
}

function assertTemplateIsActive(template: TemplateForSubmission): void {
  if (template.status !== "ACTIVE") {
    throw new ValidationError(
      "Requests can only be submitted from active workflow templates",
    );
  }
}

function getFirstApprovalStepOrThrow(template: TemplateForSubmission) {
  const firstStep = template.steps[0];

  if (!firstStep) {
    throw new ValidationError(
      "This workflow template has no approval steps configured",
    );
  }

  return firstStep;
}

const EDITABLE_REQUEST_STATUSES = new Set(["DRAFT", "CHANGES_REQUESTED"]);

async function resolveResubmitStepId(
  workflowRequestId: string,
  currentStepId: string | null,
): Promise<string> {
  if (currentStepId) {
    return currentStepId;
  }

  const stepId = await findLatestChangesRequestedStepId(workflowRequestId);

  if (!stepId) {
    throw new ConflictError(
      "This request has no approval step to return to after changes",
    );
  }

  return stepId;
}

export async function submitWorkflowRequest(
  organisationId: string,
  requesterId: string,
  input: SubmitWorkflowRequestBody,
): Promise<SubmittedWorkflowRequestResponse> {
  const template = await loadTemplateForRequestOrThrow(
    input.workflowTemplateId,
    organisationId,
  );

  assertTemplateIsActive(template);

  const firstStep = getFirstApprovalStepOrThrow(template);

  const validatedValues = validateRequestValues(template.fields, input.values, {
    enforceRequired: true,
  });

  const request = await prisma.$transaction(async (tx) =>
    createWorkflowRequestWithValues(
      {
        organisationId,
        workflowTemplateId: template.id,
        requesterId,
        currentStepId: firstStep.id,
        status: "PENDING_APPROVAL",
        title: input.title,
        submittedAt: new Date(),
        values: validatedValues,
      },
      tx,
    ),
  );

  logger.info(
    {
      origin: "api",
      event: "workflow_request.submitted",
      organisationId,
      workflowRequestId: request.id,
      workflowTemplateId: template.id,
      requesterId,
      currentStepId: firstStep.id,
      valuesCount: validatedValues.length,
    },
    `[API] Workflow request submitted for template "${template.name}"`,
  );

  recordWorkflowRequestAuditEvent({
    action: WORKFLOW_REQUEST_AUDIT_ACTIONS.SUBMITTED,
    organisationId,
    actorUserId: requesterId,
    entityId: request.id,
    metadata: {
      workflowTemplateId: template.id,
      templateName: template.name,
      status: request.status,
      currentStepId: firstStep.id,
      title: input.title ?? null,
    },
  });

  notifyApproversOfPendingRequest({
    organisationId,
    workflowRequestId: request.id,
    workflowTemplateId: template.id,
    stepId: firstStep.id,
    approverRoleId: firstStep.approverRoleId,
    stepName: firstStep.name,
  });

  return toSubmittedWorkflowRequestResponse(request);
}

export async function listMyWorkflowRequests(
  organisationId: string,
  requesterId: string,
  query: ListWorkflowRequestsQuery,
): Promise<PaginatedWorkflowRequestsResponse> {
  const filters = {
    requesterId,
    status: query.status,
    workflowTemplateId: query.workflowTemplateId,
    search: query.search,
    page: query.page,
    limit: query.limit,
  };

  const [requests, total] = await Promise.all([
    findWorkflowRequests(organisationId, filters),
    countWorkflowRequests(organisationId, filters),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

  return {
    items: requests.map(toWorkflowRequestListItem),
    page: query.page,
    limit: query.limit,
    total,
    totalPages,
  };
}

export async function listOrganisationWorkflowRequests(
  organisationId: string,
  query: ListWorkflowRequestsQuery,
): Promise<PaginatedWorkflowRequestsResponse> {
  const filters = {
    requesterId: query.requesterId,
    status: query.status,
    workflowTemplateId: query.workflowTemplateId,
    search: query.search,
    page: query.page,
    limit: query.limit,
  };

  const [requests, total] = await Promise.all([
    findWorkflowRequests(organisationId, filters),
    countWorkflowRequests(organisationId, filters),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

  return {
    items: requests.map(toWorkflowRequestListItem),
    page: query.page,
    limit: query.limit,
    total,
    totalPages,
  };
}

export type { WorkflowRequestViewer } from "./workflow-request.access";

export async function getWorkflowRequestDetail(
  organisationId: string,
  viewer: WorkflowRequestViewer,
  workflowRequestId: string,
): Promise<WorkflowRequestDetailResponse> {
  const request = await findWorkflowRequestDetail(
    workflowRequestId,
    organisationId,
  );

  if (!request) {
    throw new NotFoundError("Workflow request not found");
  }

  const canView = await viewerCanAccessWorkflowRequest(viewer, {
    requesterId: request.requesterId,
    currentStepApproverRoleId: request.currentStep?.approverRoleId ?? null,
  });

  if (!canView) {
    throw new AuthorizationError(
      "You do not have permission to view this workflow request",
    );
  }

  return toWorkflowRequestDetailResponse(request);
}

export async function cancelWorkflowRequest(
  organisationId: string,
  requesterId: string,
  workflowRequestId: string,
): Promise<CancelledWorkflowRequestResponse> {
  const existing = await findWorkflowRequestForMutation(
    workflowRequestId,
    organisationId,
  );

  if (!existing) {
    throw new NotFoundError("Workflow request not found");
  }

  if (existing.requesterId !== requesterId) {
    throw new AuthorizationError("You can only cancel your own requests");
  }

  assertRequestCanBeCancelled(existing.status);

  const cancelledAt = new Date();
  const request = await markWorkflowRequestCancelled(
    workflowRequestId,
    cancelledAt,
  );

  logger.info(
    {
      origin: "api",
      event: "workflow_request.cancelled",
      organisationId,
      workflowRequestId,
      requesterId,
      previousStatus: existing.status,
    },
    `[API] Workflow request "${workflowRequestId}" cancelled`,
  );

  recordWorkflowRequestAuditEvent({
    action: WORKFLOW_REQUEST_AUDIT_ACTIONS.CANCELLED,
    organisationId,
    actorUserId: requesterId,
    entityId: workflowRequestId,
    metadata: {
      workflowTemplateId: existing.workflowTemplateId,
      status: request.status,
      previousStatus: existing.status,
    },
  });

  return toCancelledWorkflowRequestResponse(request);
}

function assertRequestCanBeCancelled(status: string): void {
  if (status === "APPROVED") {
    throw new ConflictError("Completed requests cannot be cancelled");
  }

  if (status === "REJECTED") {
    throw new ConflictError("Rejected requests cannot be cancelled");
  }

  if (status === "CANCELLED") {
    throw new ConflictError("This request has already been cancelled");
  }
}

export async function saveDraftWorkflowRequest(
  organisationId: string,
  requesterId: string,
  input: SaveDraftWorkflowRequestBody,
): Promise<DraftWorkflowRequestResponse> {
  const template = await loadTemplateForRequestOrThrow(
    input.workflowTemplateId,
    organisationId,
  );

  // Drafts may be incomplete: validate the shape/types of any provided values
  // but do not enforce required fields until final submission.
  const validatedValues = validateRequestValues(template.fields, input.values, {
    enforceRequired: false,
  });

  const draft = await prisma.$transaction(async (tx) =>
    createDraftWorkflowRequestRecord(
      {
        organisationId,
        workflowTemplateId: template.id,
        requesterId,
        title: input.title,
        values: validatedValues,
      },
      tx,
    ),
  );

  logger.info(
    {
      origin: "api",
      event: "workflow_request.draft_created",
      organisationId,
      workflowRequestId: draft.id,
      workflowTemplateId: template.id,
      requesterId,
      valuesCount: validatedValues.length,
    },
    `[API] Workflow request draft created for template "${template.name}"`,
  );

  recordWorkflowRequestAuditEvent({
    action: WORKFLOW_REQUEST_AUDIT_ACTIONS.DRAFT_CREATED,
    organisationId,
    actorUserId: requesterId,
    entityId: draft.id,
    metadata: {
      workflowTemplateId: template.id,
      templateName: template.name,
      status: draft.status,
      title: input.title ?? null,
    },
  });

  return toDraftWorkflowRequestResponse(draft);
}

export async function updateDraftWorkflowRequest(
  organisationId: string,
  requesterId: string,
  workflowRequestId: string,
  input: UpdateDraftWorkflowRequestBody,
): Promise<DraftWorkflowRequestResponse> {
  const existing = await findWorkflowRequestForMutation(
    workflowRequestId,
    organisationId,
  );

  if (!existing) {
    throw new NotFoundError("Workflow request not found");
  }

  if (existing.requesterId !== requesterId) {
    throw new AuthorizationError("You can only modify your own requests");
  }

  if (!EDITABLE_REQUEST_STATUSES.has(existing.status)) {
    throw new ConflictError(
      "Only draft or changes-requested requests can be updated",
    );
  }

  let validatedValues: ValidatedRequestValue[] | undefined;

  if (input.values !== undefined) {
    const template = await loadTemplateForRequestOrThrow(
      existing.workflowTemplateId,
      organisationId,
    );

    validatedValues = validateRequestValues(template.fields, input.values, {
      enforceRequired: false,
    });
  }

  const draft = await prisma.$transaction(async (tx) =>
    updateDraftWorkflowRequestRecord(
      {
        workflowRequestId,
        title: input.title,
        values: validatedValues,
      },
      tx,
    ),
  );

  if (!draft) {
    throw new NotFoundError("Workflow request not found");
  }

  logger.info(
    {
      origin: "api",
      event:
        existing.status === "CHANGES_REQUESTED"
          ? "workflow_request.changes_requested_updated"
          : "workflow_request.draft_updated",
      organisationId,
      workflowRequestId,
      requesterId,
      replacedValues: input.values !== undefined,
    },
    existing.status === "CHANGES_REQUESTED"
      ? `[API] Workflow request "${workflowRequestId}" updated after changes requested`
      : `[API] Workflow request draft "${workflowRequestId}" updated`,
  );

  recordWorkflowRequestAuditEvent({
    action:
      existing.status === "CHANGES_REQUESTED"
        ? WORKFLOW_REQUEST_AUDIT_ACTIONS.CHANGES_REQUESTED_UPDATED
        : WORKFLOW_REQUEST_AUDIT_ACTIONS.DRAFT_UPDATED,
    organisationId,
    actorUserId: requesterId,
    entityId: workflowRequestId,
    metadata: {
      workflowTemplateId: existing.workflowTemplateId,
      status: draft.status,
      replacedValues: input.values !== undefined,
    },
  });

  return toDraftWorkflowRequestResponse(draft);
}

export async function submitDraftWorkflowRequest(
  organisationId: string,
  requesterId: string,
  workflowRequestId: string,
): Promise<SubmittedWorkflowRequestResponse> {
  const existing = await findWorkflowRequestForMutation(
    workflowRequestId,
    organisationId,
  );

  if (!existing) {
    throw new NotFoundError("Workflow request not found");
  }

  if (existing.requesterId !== requesterId) {
    throw new AuthorizationError("You can only submit your own requests");
  }

  if (existing.status === "CHANGES_REQUESTED") {
    return resubmitChangesRequestedWorkflowRequest(
      organisationId,
      requesterId,
      workflowRequestId,
      existing,
    );
  }

  if (existing.status !== "DRAFT") {
    throw new ConflictError("Only draft requests can be submitted");
  }

  const template = await loadTemplateForRequestOrThrow(
    existing.workflowTemplateId,
    organisationId,
  );

  assertTemplateIsActive(template);

  const firstStep = getFirstApprovalStepOrThrow(template);

  const submittedValues: SubmittedRequestValue[] = existing.values.map((value) => ({
    workflowFieldId: value.workflowFieldId,
    value: value.value as SubmittedRequestValue["value"],
  }));

  const validatedValues = validateRequestValues(template.fields, submittedValues, {
    enforceRequired: true,
  });

  const submittedAt = new Date();

  const request = await prisma.$transaction(async (tx) =>
    submitDraftWorkflowRequestRecord(
      {
        workflowRequestId,
        currentStepId: firstStep.id,
        submittedAt,
        values: validatedValues,
      },
      tx,
    ),
  );

  logger.info(
    {
      origin: "api",
      event: "workflow_request.submitted",
      organisationId,
      workflowRequestId: request.id,
      workflowTemplateId: template.id,
      requesterId,
      currentStepId: firstStep.id,
      valuesCount: validatedValues.length,
      fromDraft: true,
    },
    `[API] Draft workflow request submitted for template "${template.name}"`,
  );

  recordWorkflowRequestAuditEvent({
    action: WORKFLOW_REQUEST_AUDIT_ACTIONS.SUBMITTED,
    organisationId,
    actorUserId: requesterId,
    entityId: request.id,
    metadata: {
      workflowTemplateId: template.id,
      templateName: template.name,
      status: request.status,
      currentStepId: firstStep.id,
      fromDraft: true,
    },
  });

  notifyApproversOfPendingRequest({
    organisationId,
    workflowRequestId: request.id,
    workflowTemplateId: template.id,
    stepId: firstStep.id,
    approverRoleId: firstStep.approverRoleId,
    stepName: firstStep.name,
  });

  return toSubmittedWorkflowRequestResponse(request);
}

async function resubmitChangesRequestedWorkflowRequest(
  organisationId: string,
  requesterId: string,
  workflowRequestId: string,
  existing: NonNullable<Awaited<ReturnType<typeof findWorkflowRequestForMutation>>>,
): Promise<SubmittedWorkflowRequestResponse> {
  const template = await loadTemplateForRequestOrThrow(
    existing.workflowTemplateId,
    organisationId,
  );

  assertTemplateIsActive(template);

  const resubmitStepId = await resolveResubmitStepId(
    workflowRequestId,
    existing.currentStepId,
  );

  const resubmitStep = template.steps.find((step) => step.id === resubmitStepId);

  if (!resubmitStep) {
    throw new ConflictError("The approval step for this request is no longer valid");
  }

  const submittedValues: SubmittedRequestValue[] = existing.values.map((value) => ({
    workflowFieldId: value.workflowFieldId,
    value: value.value as SubmittedRequestValue["value"],
  }));

  const validatedValues = validateRequestValues(template.fields, submittedValues, {
    enforceRequired: true,
  });

  const request = await prisma.$transaction(async (tx) =>
    resubmitChangesRequestedWorkflowRequestRecord(
      {
        workflowRequestId,
        currentStepId: resubmitStepId,
        values: validatedValues,
      },
      tx,
    ),
  );

  logger.info(
    {
      origin: "api",
      event: "workflow_request.resubmitted",
      organisationId,
      workflowRequestId: request.id,
      workflowTemplateId: template.id,
      requesterId,
      currentStepId: resubmitStepId,
      valuesCount: validatedValues.length,
    },
    `[API] Workflow request "${request.title ?? request.id}" resubmitted after changes`,
  );

  recordWorkflowRequestAuditEvent({
    action: WORKFLOW_REQUEST_AUDIT_ACTIONS.RESUBMITTED,
    organisationId,
    actorUserId: requesterId,
    entityId: request.id,
    metadata: {
      workflowTemplateId: template.id,
      templateName: template.name,
      status: request.status,
      currentStepId: resubmitStepId,
      fromChangesRequested: true,
    },
  });

  notifyApproversOfPendingRequest({
    organisationId,
    workflowRequestId: request.id,
    workflowTemplateId: template.id,
    stepId: resubmitStepId,
    approverRoleId: resubmitStep.approverRoleId,
    stepName: resubmitStep.name,
  });

  return toSubmittedWorkflowRequestResponse(request);
}
