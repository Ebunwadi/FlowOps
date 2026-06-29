-- Sprint 7 Issue 1: align notifications with per-user in-app model

DROP TABLE IF EXISTS "notifications";

DROP TYPE IF EXISTS "NotificationEvent";

CREATE TYPE "NotificationType" AS ENUM (
  'APPROVAL_REQUIRED',
  'REQUEST_APPROVED',
  'REQUEST_REJECTED',
  'REQUEST_COMPLETED',
  'CHANGES_REQUESTED',
  'COMMENT_ADDED',
  'MEMBER_INVITED',
  'WORKFLOW_UPDATED'
);

CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "actionUrl" TEXT,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_organisationId_idx" ON "notifications"("organisationId");
CREATE INDEX "notifications_recipientId_idx" ON "notifications"("recipientId");
CREATE INDEX "notifications_type_idx" ON "notifications"("type");
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_organisationId_fkey"
  FOREIGN KEY ("organisationId") REFERENCES "organisations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_recipientId_fkey"
  FOREIGN KEY ("recipientId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
