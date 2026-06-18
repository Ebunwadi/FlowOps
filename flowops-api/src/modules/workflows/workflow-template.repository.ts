import type { DbClient } from "../../common/types/database";
import { prisma } from "../../config/database";
import type { WorkflowTemplateStatus } from "../../generated/prisma/client";
import type {
  WorkflowFieldInput,
  WorkflowStepInput,
} from "./workflow-template.validation";
import { toCreatedWorkflowTemplateSummary } from "./workflow-template.mapper";
import type { CreatedWorkflowTemplateSummary } from "./workflow-template.mapper";

export interface ListWorkflowTemplatesFilters {
  search?: string;
  status?: WorkflowTemplateStatus;
  category?: string;
  page: number;
  limit: number;
}

export interface CreateWorkflowTemplateRecordInput {
  organisationId: string;
  createdById: string;
  name: string;
  description?: string;
  category?: string;
  fields: WorkflowFieldInput[];
  steps: WorkflowStepInput[];
}

const workflowTemplateListSelect = {
  id: true,
  name: true,
  description: true,
  category: true,
  status: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      fields: true,
      steps: true,
    },
  },
} as const;

const workflowTemplateDetailInclude = {
  fields: {
    orderBy: {
      fieldOrder: "asc" as const,
    },
  },
  steps: {
    orderBy: {
      stepOrder: "asc" as const,
    },
    include: {
      approverRole: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
  },
} as const;

function buildWorkflowTemplateListWhere(
  organisationId: string,
  filters: Pick<ListWorkflowTemplatesFilters, "search" | "status" | "category">,
) {
  return {
    organisationId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.search
      ? {
          OR: [
            {
              name: {
                contains: filters.search,
                mode: "insensitive" as const,
              },
            },
            {
              description: {
                contains: filters.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };
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

export async function findWorkflowTemplatesByOrganisation(
  organisationId: string,
  filters: ListWorkflowTemplatesFilters,
  db: DbClient = prisma,
) {
  const where = buildWorkflowTemplateListWhere(organisationId, filters);
  const skip = (filters.page - 1) * filters.limit;

  return db.workflowTemplate.findMany({
    where,
    select: workflowTemplateListSelect,
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    skip,
    take: filters.limit,
  });
}

export async function countWorkflowTemplatesByOrganisation(
  organisationId: string,
  filters: Pick<ListWorkflowTemplatesFilters, "search" | "status" | "category">,
  db: DbClient = prisma,
) {
  return db.workflowTemplate.count({
    where: buildWorkflowTemplateListWhere(organisationId, filters),
  });
}

export async function findWorkflowTemplateByIdInOrganisation(
  workflowTemplateId: string,
  organisationId: string,
  db: DbClient = prisma,
) {
  return db.workflowTemplate.findFirst({
    where: {
      id: workflowTemplateId,
      organisationId,
    },
    include: workflowTemplateDetailInclude,
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
