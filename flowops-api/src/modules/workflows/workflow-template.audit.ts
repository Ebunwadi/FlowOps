import { recordAuditEvent } from "../audit-log/audit-log.service";

export const WORKFLOW_TEMPLATE_AUDIT_ACTIONS = {
  CREATED: "WORKFLOW_TEMPLATE_CREATED",
  UPDATED: "WORKFLOW_TEMPLATE_UPDATED",
  ACTIVATED: "WORKFLOW_TEMPLATE_ACTIVATED",
  DEACTIVATED: "WORKFLOW_TEMPLATE_DEACTIVATED",
  ARCHIVED: "WORKFLOW_TEMPLATE_ARCHIVED",
} as const;

export const WORKFLOW_TEMPLATE_ENTITY_TYPE = "WORKFLOW_TEMPLATE";

interface RecordWorkflowTemplateAuditEventInput {
  action: (typeof WORKFLOW_TEMPLATE_AUDIT_ACTIONS)[keyof typeof WORKFLOW_TEMPLATE_AUDIT_ACTIONS];
  organisationId: string;
  actorUserId: string;
  entityId: string;
  metadata: Record<string, unknown> & {
    templateName: string;
    status: string;
  };
}

export function recordWorkflowTemplateAuditEvent(
  input: RecordWorkflowTemplateAuditEventInput,
): void {
  recordAuditEvent({
    action: input.action,
    organisationId: input.organisationId,
    actorUserId: input.actorUserId,
    entityType: WORKFLOW_TEMPLATE_ENTITY_TYPE,
    entityId: input.entityId,
    metadata: input.metadata,
  });
}
