import { recordAuditEvent } from "../audit-log/audit-log.service";

export const WORKFLOW_REQUEST_AUDIT_ACTIONS = {
  SUBMITTED: "WORKFLOW_REQUEST_SUBMITTED",
  RESUBMITTED: "WORKFLOW_REQUEST_RESUBMITTED",
  DRAFT_CREATED: "WORKFLOW_REQUEST_DRAFT_CREATED",
  DRAFT_UPDATED: "WORKFLOW_REQUEST_DRAFT_UPDATED",
  CHANGES_REQUESTED_UPDATED: "WORKFLOW_REQUEST_CHANGES_REQUESTED_UPDATED",
  CANCELLED: "WORKFLOW_REQUEST_CANCELLED",
} as const;

export const WORKFLOW_REQUEST_ENTITY_TYPE = "WORKFLOW_REQUEST";

interface RecordWorkflowRequestAuditEventInput {
  action: (typeof WORKFLOW_REQUEST_AUDIT_ACTIONS)[keyof typeof WORKFLOW_REQUEST_AUDIT_ACTIONS];
  organisationId: string;
  actorUserId: string;
  entityId: string;
  metadata: Record<string, unknown> & {
    workflowTemplateId: string;
    status: string;
  };
}

export function recordWorkflowRequestAuditEvent(
  input: RecordWorkflowRequestAuditEventInput,
): void {
  recordAuditEvent({
    action: input.action,
    organisationId: input.organisationId,
    actorUserId: input.actorUserId,
    entityType: WORKFLOW_REQUEST_ENTITY_TYPE,
    entityId: input.entityId,
    metadata: input.metadata,
  });
}
