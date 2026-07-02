import { recordAuditEvent } from "../audit-log/audit-log.service";

export const ATTACHMENT_AUDIT_ACTIONS = {
  UPLOADED: "ATTACHMENT_UPLOADED",
  DOWNLOADED: "ATTACHMENT_DOWNLOADED",
  DELETED: "ATTACHMENT_DELETED",
} as const;

export const ATTACHMENT_ENTITY_TYPE = "ATTACHMENT";

interface RecordAttachmentAuditEventInput {
  action: (typeof ATTACHMENT_AUDIT_ACTIONS)[keyof typeof ATTACHMENT_AUDIT_ACTIONS];
  organisationId: string;
  actorUserId: string;
  attachmentId: string;
  workflowRequestId: string;
  metadata: Record<string, unknown> & {
    originalFileName: string;
    mimeType: string;
    fileSize: number;
  };
}

export function recordAttachmentAuditEvent(
  input: RecordAttachmentAuditEventInput,
): void {
  recordAuditEvent({
    action: input.action,
    organisationId: input.organisationId,
    actorUserId: input.actorUserId,
    entityType: ATTACHMENT_ENTITY_TYPE,
    entityId: input.attachmentId,
    metadata: {
      workflowRequestId: input.workflowRequestId,
      ...input.metadata,
    },
  });
}
