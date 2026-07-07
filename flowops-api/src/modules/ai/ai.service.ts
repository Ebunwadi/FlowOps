import { AuthorizationError, NotFoundError } from "../../common/errors/httpErrors";
import { logger } from "../../config/logger";
import { DEFAULT_ORGANISATION_SETTINGS } from "../organisation-settings/organisation-settings.defaults";
import { findOrganisationSettingsByOrganisationId } from "../organisation-settings/organisation-settings.repository";
import {
  viewerCanAccessWorkflowRequest,
  type WorkflowRequestViewer,
} from "../workflow-requests/workflow-request.access";
import { findWorkflowRequestDetail } from "../workflow-requests/workflow-request.repository";
import {
  recordAiRequestSummaryAuditEvent,
  recordAiWorkflowGenerationAuditEvent,
} from "./ai.audit";
import { AiGenerationError } from "./ai.errors";
import { getAiProvider } from "./ai.provider";
import { buildWorkflowRequestSummaryContext } from "./ai.request-summary.context";
import type { GenerateWorkflowSuggestionBody } from "./ai.validation";
import {
  parseGeneratedWorkflowSuggestion,
  parseRequestSummary,
  type GeneratedWorkflowSuggestion,
  type RequestSummaryResponse,
} from "./ai.validation";

export async function assertAiFeaturesEnabled(
  organisationId: string,
): Promise<void> {
  const settings = await findOrganisationSettingsByOrganisationId(organisationId);
  const allowAiFeatures =
    settings?.allowAiFeatures ?? DEFAULT_ORGANISATION_SETTINGS.allowAiFeatures;

  if (!allowAiFeatures) {
    throw new AuthorizationError("AI features are disabled for this organisation");
  }
}

export async function generateWorkflowSuggestion(
  organisationId: string,
  actorUserId: string,
  input: GenerateWorkflowSuggestionBody,
): Promise<GeneratedWorkflowSuggestion> {
  await assertAiFeaturesEnabled(organisationId);

  let rawSuggestion: unknown;

  try {
    rawSuggestion = await getAiProvider().generateWorkflowSuggestion({
      prompt: input.prompt,
    });
  } catch (error) {
    logger.error(
      {
        origin: "api",
        event: "ai.workflow_generation_failed",
        organisationId,
        actorUserId,
        error,
      },
      "[API] Failed to generate AI workflow suggestion",
    );

    if (error instanceof AiGenerationError) {
      throw error;
    }

    throw new AiGenerationError();
  }

  let suggestion: GeneratedWorkflowSuggestion;

  try {
    suggestion = parseGeneratedWorkflowSuggestion(rawSuggestion);
  } catch (error) {
    logger.error(
      {
        origin: "api",
        event: "ai.workflow_generation_invalid_output",
        organisationId,
        actorUserId,
        error,
      },
      "[API] AI workflow suggestion failed validation",
    );

    throw new AiGenerationError("AI provider returned an invalid workflow suggestion");
  }

  logger.info(
    {
      origin: "api",
      event: "ai.workflow_generated",
      organisationId,
      actorUserId,
      suggestionName: suggestion.name,
      fieldsCount: suggestion.fields.length,
      stepsCount: suggestion.steps.length,
    },
    `[API] AI workflow suggestion generated for "${suggestion.name}"`,
  );

  recordAiWorkflowGenerationAuditEvent({
    organisationId,
    actorUserId,
    promptLength: input.prompt.length,
    suggestionName: suggestion.name,
    fieldsCount: suggestion.fields.length,
    stepsCount: suggestion.steps.length,
  });

  return suggestion;
}

export async function generateWorkflowRequestSummary(
  organisationId: string,
  viewer: WorkflowRequestViewer,
  workflowRequestId: string,
): Promise<RequestSummaryResponse> {
  await assertAiFeaturesEnabled(organisationId);

  const request = await findWorkflowRequestDetail(
    workflowRequestId,
    organisationId,
  );

  if (!request) {
    throw new NotFoundError("Workflow request not found");
  }

  const canView = await viewerCanAccessWorkflowRequest(organisationId, viewer, {
    requesterId: request.requesterId,
    currentStepApproverRoleId: request.currentStep?.approverRoleId ?? null,
  });

  if (!canView) {
    throw new AuthorizationError(
      "You do not have permission to view this workflow request",
    );
  }

  const context = buildWorkflowRequestSummaryContext(request);

  let summary: string;

  try {
    summary = await getAiProvider().generateRequestSummary({ context });
    summary = parseRequestSummary(summary);
  } catch (error) {
    logger.error(
      {
        origin: "api",
        event: "ai.request_summary_failed",
        organisationId,
        actorUserId: viewer.userId,
        workflowRequestId,
        error,
      },
      "[API] Failed to generate AI request summary",
    );

    if (error instanceof AiGenerationError || error instanceof AuthorizationError) {
      throw error;
    }

    throw new AiGenerationError("Failed to generate request summary");
  }

  logger.info(
    {
      origin: "api",
      event: "ai.request_summary_generated",
      organisationId,
      actorUserId: viewer.userId,
      workflowRequestId,
      summaryLength: summary.length,
    },
    `[API] AI request summary generated for workflow request "${workflowRequestId}"`,
  );

  recordAiRequestSummaryAuditEvent({
    organisationId,
    actorUserId: viewer.userId,
    workflowRequestId,
    summaryLength: summary.length,
  });

  return { summary };
}
