import { recordAuditEvent } from "../audit-log/audit-log.service";

export const API_KEY_AUDIT_ACTIONS = {
  CREATED: "API_KEY_CREATED",
  REVOKED: "API_KEY_REVOKED",
} as const;

export const API_KEY_ENTITY_TYPE = "API_KEY";

interface RecordApiKeyAuditEventInput {
  action: (typeof API_KEY_AUDIT_ACTIONS)[keyof typeof API_KEY_AUDIT_ACTIONS];
  organisationId: string;
  actorUserId: string;
  apiKeyId: string;
  metadata?: Record<string, unknown>;
}

export function recordApiKeyAuditEvent(input: RecordApiKeyAuditEventInput): void {
  recordAuditEvent({
    action: input.action,
    organisationId: input.organisationId,
    actorUserId: input.actorUserId,
    entityType: API_KEY_ENTITY_TYPE,
    entityId: input.apiKeyId,
    metadata: input.metadata,
  });
}
