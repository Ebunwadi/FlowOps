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

export interface UpdateWorkflowTemplateRecordInput {
  workflowTemplateId: string;
  organisationId: string;
  name?: string;
  description?: string;
  category?: string;
  fields?: WorkflowFieldInput[];
  steps?: WorkflowStepInput[];
}

function mapFieldCreateData(field: WorkflowFieldInput) {
  return {
    label: field.label,
    fieldKey: field.fieldKey,
    fieldType: field.fieldType,
    helpText: field.helpText,
    placeholder: field.placeholder,
    isRequired: field.isRequired,
    options: field.options,
    validationRules: field.validationRules,
    fieldOrder: field.fieldOrder,
  };
}

function mapStepCreateData(step: WorkflowStepInput) {
  return {
    name: step.name,
    description: step.description,
    stepOrder: step.stepOrder,
    approverRoleId: step.approverRoleId,
    slaHours: step.slaHours,
    allowDelegation: step.allowDelegation,
    condition: step.condition,
  };
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
    ...(filters.status
      ? { status: filters.status }
      : { status: { not: "ARCHIVED" as const } }),
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
  excludeWorkflowTemplateId?: string,
  db: DbClient = prisma,
) {
  return db.workflowTemplate.findFirst({
    where: {
      organisationId,
      name,
      ...(excludeWorkflowTemplateId
        ? { id: { not: excludeWorkflowTemplateId } }
        : {}),
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
        create: input.fields.map((field) => mapFieldCreateData(field)),
      },
      steps: {
        create: input.steps.map((step) => mapStepCreateData(step)),
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

export async function updateWorkflowTemplateWithRelations(
  input: UpdateWorkflowTemplateRecordInput,
  db: DbClient,
) {
  const existingTemplate = await db.workflowTemplate.findFirst({
    where: {
      id: input.workflowTemplateId,
      organisationId: input.organisationId,
    },
    select: {
      id: true,
    },
  });

  if (!existingTemplate) {
    return null;
  }

  await db.workflowTemplate.update({
    where: { id: input.workflowTemplateId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
    },
  });

  if (input.fields) {
    await db.workflowField.deleteMany({
      where: { workflowTemplateId: input.workflowTemplateId },
    });

    if (input.fields.length > 0) {
      await db.workflowField.createMany({
        data: input.fields.map((field) => ({
          workflowTemplateId: input.workflowTemplateId,
          ...mapFieldCreateData(field),
        })),
      });
    }
  }

  if (input.steps) {
    await db.workflowStep.deleteMany({
      where: { workflowTemplateId: input.workflowTemplateId },
    });

    if (input.steps.length > 0) {
      await db.workflowStep.createMany({
        data: input.steps.map((step) => ({
          workflowTemplateId: input.workflowTemplateId,
          ...mapStepCreateData(step),
        })),
      });
    }
  }

  return findWorkflowTemplateByIdInOrganisation(
    input.workflowTemplateId,
    input.organisationId,
    db,
  );
}

export async function findWorkflowTemplateForStatusChange(
  workflowTemplateId: string,
  organisationId: string,
  db: DbClient = prisma,
) {
  return db.workflowTemplate.findFirst({
    where: {
      id: workflowTemplateId,
      organisationId,
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
}

export async function updateWorkflowTemplateStatus(
  workflowTemplateId: string,
  data: {
    status: WorkflowTemplateStatus;
    isActive: boolean;
  },
  db: DbClient = prisma,
) {
  return db.workflowTemplate.update({
    where: { id: workflowTemplateId },
    data,
    select: {
      id: true,
      name: true,
      status: true,
      isActive: true,
    },
  });
}
