import { recordAuditEvent } from "../audit-log/audit-log.service";

export const AI_AUDIT_ACTIONS = {
  WORKFLOW_GENERATED: "AI_WORKFLOW_GENERATED",
  REQUEST_SUMMARY_GENERATED: "AI_REQUEST_SUMMARY_GENERATED",
} as const;

export const AI_ENTITY_TYPE = "AI_WORKFLOW_SUGGESTION";
export const AI_REQUEST_SUMMARY_ENTITY_TYPE = "WORKFLOW_REQUEST";

interface RecordAiWorkflowGenerationAuditEventInput {
  organisationId: string;
  actorUserId: string;
  promptLength: number;
  suggestionName: string;
  fieldsCount: number;
  stepsCount: number;
}

export function recordAiWorkflowGenerationAuditEvent(
  input: RecordAiWorkflowGenerationAuditEventInput,
): void {
  recordAuditEvent({
    action: AI_AUDIT_ACTIONS.WORKFLOW_GENERATED,
    organisationId: input.organisationId,
    actorUserId: input.actorUserId,
    entityType: AI_ENTITY_TYPE,
    metadata: {
      promptLength: input.promptLength,
      suggestionName: input.suggestionName,
      fieldsCount: input.fieldsCount,
      stepsCount: input.stepsCount,
    },
  });
}

interface RecordAiRequestSummaryAuditEventInput {
  organisationId: string;
  actorUserId: string;
  workflowRequestId: string;
  summaryLength: number;
}

export function recordAiRequestSummaryAuditEvent(
  input: RecordAiRequestSummaryAuditEventInput,
): void {
  recordAuditEvent({
    action: AI_AUDIT_ACTIONS.REQUEST_SUMMARY_GENERATED,
    organisationId: input.organisationId,
    actorUserId: input.actorUserId,
    entityType: AI_REQUEST_SUMMARY_ENTITY_TYPE,
    entityId: input.workflowRequestId,
    metadata: {
      summaryLength: input.summaryLength,
    },
  });
}
