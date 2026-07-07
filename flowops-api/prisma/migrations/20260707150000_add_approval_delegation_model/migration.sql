-- CreateTable
CREATE TABLE "approval_delegations" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "workflowRequestId" TEXT NOT NULL,
    "workflowStepId" TEXT NOT NULL,
    "delegatedById" TEXT NOT NULL,
    "delegatedToId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_delegations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "approval_delegations_workflowRequestId_workflowStepId_key" ON "approval_delegations"("workflowRequestId", "workflowStepId");

-- CreateIndex
CREATE INDEX "approval_delegations_organisationId_idx" ON "approval_delegations"("organisationId");

-- CreateIndex
CREATE INDEX "approval_delegations_delegatedToId_idx" ON "approval_delegations"("delegatedToId");

-- AddForeignKey
ALTER TABLE "approval_delegations" ADD CONSTRAINT "approval_delegations_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_delegations" ADD CONSTRAINT "approval_delegations_workflowRequestId_fkey" FOREIGN KEY ("workflowRequestId") REFERENCES "workflow_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_delegations" ADD CONSTRAINT "approval_delegations_workflowStepId_fkey" FOREIGN KEY ("workflowStepId") REFERENCES "workflow_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_delegations" ADD CONSTRAINT "approval_delegations_delegatedById_fkey" FOREIGN KEY ("delegatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_delegations" ADD CONSTRAINT "approval_delegations_delegatedToId_fkey" FOREIGN KEY ("delegatedToId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
