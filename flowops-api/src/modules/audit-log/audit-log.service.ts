import { logger } from "../../config/logger";

export interface AuditLogEventInput {
  action: string;
  organisationId: string;
  actorUserId: string;
  entityType?: string;
  entityId?: string;
  targetUserId?: string;
  targetMemberId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Placeholder until the audit log module persists events to the database.
 */
export function recordAuditEvent(input: AuditLogEventInput): void {
  logger.info(
    {
      origin: "api",
      event: "audit.placeholder",
      auditAction: input.action,
      organisationId: input.organisationId,
      actorUserId: input.actorUserId,
      entityType: input.entityType,
      entityId: input.entityId,
      targetUserId: input.targetUserId,
      targetMemberId: input.targetMemberId,
      metadata: input.metadata,
    },
    `[API] Audit placeholder: ${input.action}`,
  );
}
