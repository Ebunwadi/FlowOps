-- CreateEnum
CREATE TYPE "WorkflowRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "workflow_requests" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "workflowTemplateId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "currentStepId" TEXT,
    "status" "WorkflowRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT,
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_request_values" (
    "id" TEXT NOT NULL,
    "workflowRequestId" TEXT NOT NULL,
    "workflowFieldId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_request_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflow_requests_organisationId_idx" ON "workflow_requests"("organisationId");

-- CreateIndex
CREATE INDEX "workflow_requests_workflowTemplateId_idx" ON "workflow_requests"("workflowTemplateId");

-- CreateIndex
CREATE INDEX "workflow_requests_requesterId_idx" ON "workflow_requests"("requesterId");

-- CreateIndex
CREATE INDEX "workflow_requests_currentStepId_idx" ON "workflow_requests"("currentStepId");

-- CreateIndex
CREATE INDEX "workflow_requests_status_idx" ON "workflow_requests"("status");

-- CreateIndex
CREATE INDEX "workflow_request_values_workflowRequestId_idx" ON "workflow_request_values"("workflowRequestId");

-- CreateIndex
CREATE INDEX "workflow_request_values_workflowFieldId_idx" ON "workflow_request_values"("workflowFieldId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_request_values_workflowRequestId_workflowFieldId_key" ON "workflow_request_values"("workflowRequestId", "workflowFieldId");

-- AddForeignKey
ALTER TABLE "workflow_requests" ADD CONSTRAINT "workflow_requests_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_requests" ADD CONSTRAINT "workflow_requests_workflowTemplateId_fkey" FOREIGN KEY ("workflowTemplateId") REFERENCES "workflow_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_requests" ADD CONSTRAINT "workflow_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_requests" ADD CONSTRAINT "workflow_requests_currentStepId_fkey" FOREIGN KEY ("currentStepId") REFERENCES "workflow_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_request_values" ADD CONSTRAINT "workflow_request_values_workflowRequestId_fkey" FOREIGN KEY ("workflowRequestId") REFERENCES "workflow_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_request_values" ADD CONSTRAINT "workflow_request_values_workflowFieldId_fkey" FOREIGN KEY ("workflowFieldId") REFERENCES "workflow_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
