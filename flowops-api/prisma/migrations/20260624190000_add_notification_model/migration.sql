-- CreateEnum
CREATE TYPE "NotificationEvent" AS ENUM ('APPROVAL_REQUIRED', 'REQUEST_APPROVED_STEP', 'REQUEST_REJECTED', 'REQUEST_COMPLETED', 'CHANGES_REQUESTED');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "event" "NotificationEvent" NOT NULL,
    "recipientUserId" TEXT,
    "recipientRoleId" TEXT,
    "workflowRequestId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_organisationId_idx" ON "notifications"("organisationId");

-- CreateIndex
CREATE INDEX "notifications_recipientUserId_idx" ON "notifications"("recipientUserId");

-- CreateIndex
CREATE INDEX "notifications_recipientRoleId_idx" ON "notifications"("recipientRoleId");

-- CreateIndex
CREATE INDEX "notifications_workflowRequestId_idx" ON "notifications"("workflowRequestId");

-- CreateIndex
CREATE INDEX "notifications_event_idx" ON "notifications"("event");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientRoleId_fkey" FOREIGN KEY ("recipientRoleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workflowRequestId_fkey" FOREIGN KEY ("workflowRequestId") REFERENCES "workflow_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
