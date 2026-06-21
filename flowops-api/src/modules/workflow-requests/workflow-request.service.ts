import { NotFoundError, ValidationError } from "../../common/errors/httpErrors";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import {
  recordWorkflowRequestAuditEvent,
  WORKFLOW_REQUEST_AUDIT_ACTIONS,
} from "./workflow-request.audit";
import {
  toSubmittedWorkflowRequestResponse,
  type SubmittedWorkflowRequestResponse,
} from "./workflow-request.mapper";
import { notifyApproversOfPendingRequest } from "./workflow-request.notifications";
import {
  createWorkflowRequestWithValues,
  findTemplateForRequestSubmission,
} from "./workflow-request.repository";
import type { SubmitWorkflowRequestBody } from "./workflow-request.validation";
import { validateRequestValues } from "./workflow-request.validator";

export async function submitWorkflowRequest(
  organisationId: string,
  requesterId: string,
  input: SubmitWorkflowRequestBody,
): Promise<SubmittedWorkflowRequestResponse> {
  const template = await findTemplateForRequestSubmission(
    input.workflowTemplateId,
    organisationId,
  );

  if (!template) {
    throw new NotFoundError("Workflow template not found");
  }

  if (template.status !== "ACTIVE") {
    throw new ValidationError(
      "Requests can only be submitted from active workflow templates",
    );
  }

  const firstStep = template.steps[0];

  if (!firstStep) {
    throw new ValidationError(
      "This workflow template has no approval steps configured",
    );
  }

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
