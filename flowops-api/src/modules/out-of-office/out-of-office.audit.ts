import { recordAuditEvent } from "../audit-log/audit-log.service";
import { WORKFLOW_REQUEST_ENTITY_TYPE } from "../workflow-requests/workflow-request.audit";

export const OUT_OF_OFFICE_AUDIT_ACTIONS = {
  REASSIGNED: "WORKFLOW_REQUEST_APPROVAL_OOO_REASSIGNED",
} as const;

interface RecordOutOfOfficeReassignmentAuditInput {
  organisationId: string;
  outOfOfficeUserId: string;
  workflowRequestId: string;
  metadata: Record<string, unknown> & {
    workflowTemplateId: string;
    status: string;
    delegateToId: string;
    stepId: string;
    stepName: string;
  };
}

export function recordOutOfOfficeReassignmentAudit(
  input: RecordOutOfOfficeReassignmentAuditInput,
): void {
  recordAuditEvent({
    action: OUT_OF_OFFICE_AUDIT_ACTIONS.REASSIGNED,
    organisationId: input.organisationId,
    actorUserId: input.outOfOfficeUserId,
    entityType: WORKFLOW_REQUEST_ENTITY_TYPE,
    entityId: input.workflowRequestId,
    metadata: input.metadata,
  });
}
