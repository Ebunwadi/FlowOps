-- CreateEnum
CREATE TYPE "WorkflowTemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkflowFieldType" AS ENUM ('SHORT_TEXT', 'LONG_TEXT', 'NUMBER', 'DATE', 'DROPDOWN', 'CHECKBOX', 'RADIO', 'FILE_UPLOAD');

-- CreateTable
CREATE TABLE "workflow_templates" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "status" "WorkflowTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_fields" (
    "id" TEXT NOT NULL,
    "workflowTemplateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "fieldType" "WorkflowFieldType" NOT NULL,
    "helpText" TEXT,
    "placeholder" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "validationRules" JSONB,
    "fieldOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_steps" (
    "id" TEXT NOT NULL,
    "workflowTemplateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stepOrder" INTEGER NOT NULL,
    "approverRoleId" TEXT NOT NULL,
    "slaHours" INTEGER,
    "allowDelegation" BOOLEAN NOT NULL DEFAULT false,
    "condition" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflow_templates_organisationId_idx" ON "workflow_templates"("organisationId");

-- CreateIndex
CREATE INDEX "workflow_templates_createdById_idx" ON "workflow_templates"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_templates_organisationId_name_key" ON "workflow_templates"("organisationId", "name");

-- CreateIndex
CREATE INDEX "workflow_fields_workflowTemplateId_idx" ON "workflow_fields"("workflowTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_fields_workflowTemplateId_fieldKey_key" ON "workflow_fields"("workflowTemplateId", "fieldKey");

-- CreateIndex
CREATE INDEX "workflow_steps_workflowTemplateId_idx" ON "workflow_steps"("workflowTemplateId");

-- CreateIndex
CREATE INDEX "workflow_steps_approverRoleId_idx" ON "workflow_steps"("approverRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_steps_workflowTemplateId_stepOrder_key" ON "workflow_steps"("workflowTemplateId", "stepOrder");

-- AddForeignKey
ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_fields" ADD CONSTRAINT "workflow_fields_workflowTemplateId_fkey" FOREIGN KEY ("workflowTemplateId") REFERENCES "workflow_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_workflowTemplateId_fkey" FOREIGN KEY ("workflowTemplateId") REFERENCES "workflow_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_approverRoleId_fkey" FOREIGN KEY ("approverRoleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
