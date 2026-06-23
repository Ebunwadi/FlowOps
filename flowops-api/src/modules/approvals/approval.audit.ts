import { recordAuditEvent } from "../audit-log/audit-log.service";
import { WORKFLOW_REQUEST_ENTITY_TYPE } from "../workflow-requests/workflow-request.audit";

export const APPROVAL_AUDIT_ACTIONS = {
  STEP_APPROVED: "WORKFLOW_REQUEST_STEP_APPROVED",
  COMPLETED: "WORKFLOW_REQUEST_COMPLETED",
} as const;

interface RecordApprovalAuditEventInput {
  action: (typeof APPROVAL_AUDIT_ACTIONS)[keyof typeof APPROVAL_AUDIT_ACTIONS];
  organisationId: string;
  actorUserId: string;
  workflowRequestId: string;
  metadata: Record<string, unknown> & {
    workflowTemplateId: string;
    status: string;
  };
}

export function recordApprovalAuditEvent(input: RecordApprovalAuditEventInput): void {
  recordAuditEvent({
    action: input.action,
    organisationId: input.organisationId,
    actorUserId: input.actorUserId,
    entityType: WORKFLOW_REQUEST_ENTITY_TYPE,
    entityId: input.workflowRequestId,
    metadata: input.metadata,
  });
}
