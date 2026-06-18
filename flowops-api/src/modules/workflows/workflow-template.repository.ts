import type { DbClient } from "../../common/types/database";
import { prisma } from "../../config/database";
import type {
  WorkflowFieldInput,
  WorkflowStepInput,
} from "./workflow-template.validation";
import { toCreatedWorkflowTemplateSummary } from "./workflow-template.mapper";
import type { CreatedWorkflowTemplateSummary } from "./workflow-template.mapper";

export interface CreateWorkflowTemplateRecordInput {
  organisationId: string;
  createdById: string;
  name: string;
  description?: string;
  category?: string;
  fields: WorkflowFieldInput[];
  steps: WorkflowStepInput[];
}

export async function findWorkflowTemplateByNameInOrganisation(
  organisationId: string,
  name: string,
  db: DbClient = prisma,
) {
  return db.workflowTemplate.findFirst({
    where: {
      organisationId,
      name,
    },
    select: {
      id: true,
    },
  });
}

export async function createWorkflowTemplateWithRelations(
  input: CreateWorkflowTemplateRecordInput,
  db: DbClient,
): Promise<CreatedWorkflowTemplateSummary> {
  const template = await db.workflowTemplate.create({
    data: {
      organisationId: input.organisationId,
      name: input.name,
      description: input.description,
      category: input.category,
      createdById: input.createdById,
      fields: {
        create: input.fields.map((field) => ({
          label: field.label,
          fieldKey: field.fieldKey,
          fieldType: field.fieldType,
          helpText: field.helpText,
          placeholder: field.placeholder,
          isRequired: field.isRequired,
          options: field.options,
          validationRules: field.validationRules,
          fieldOrder: field.fieldOrder,
        })),
      },
      steps: {
        create: input.steps.map((step) => ({
          name: step.name,
          description: step.description,
          stepOrder: step.stepOrder,
          approverRoleId: step.approverRoleId,
          slaHours: step.slaHours,
          allowDelegation: step.allowDelegation,
          condition: step.condition,
        })),
      },
    },
    select: {
      id: true,
      name: true,
      status: true,
      isActive: true,
      _count: {
        select: {
          fields: true,
          steps: true,
        },
      },
    },
  });

  return toCreatedWorkflowTemplateSummary(template);
}
