import {
  ConflictError,
  NotFoundError,
} from "../../common/errors/httpErrors";
import { isPrismaUniqueConstraintError } from "../../common/utils/isPrismaUniqueConstraintError";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { findRolesByIdsInOrganisation } from "../roles/role.repository";
import {
  createWorkflowTemplateWithRelations,
  countWorkflowTemplatesByOrganisation,
  findWorkflowTemplateByIdInOrganisation,
  findWorkflowTemplateByNameInOrganisation,
  findWorkflowTemplatesByOrganisation,
} from "./workflow-template.repository";
import type { CreatedWorkflowTemplateSummary } from "./workflow-template.mapper";
import {
  toWorkflowTemplateDetailResponse,
  toWorkflowTemplateListItem,
  type PaginatedWorkflowTemplatesResponse,
  type WorkflowTemplateDetailResponse,
} from "./workflow-template.mapper";
import {
  assertUniqueWorkflowFields,
  assertUniqueWorkflowSteps,
  type CreateWorkflowTemplateBody,
  type ListWorkflowTemplatesQuery,
} from "./workflow-template.validation";

export async function createWorkflowTemplate(
  organisationId: string,
  createdById: string,
  input: CreateWorkflowTemplateBody,
): Promise<CreatedWorkflowTemplateSummary> {
  assertUniqueWorkflowFields(input.fields);
  assertUniqueWorkflowSteps(input.steps);

  const existingTemplate = await findWorkflowTemplateByNameInOrganisation(
    organisationId,
    input.name,
  );

  if (existingTemplate) {
    throw new ConflictError(
      "A workflow template with this name already exists in this organisation",
    );
  }

  const approverRoleIds = [...new Set(input.steps.map((step) => step.approverRoleId))];
  const organisationRoles = await findRolesByIdsInOrganisation(
    organisationId,
    approverRoleIds,
  );

  if (organisationRoles.length !== approverRoleIds.length) {
    throw new NotFoundError(
      "One or more approver roles were not found in this organisation",
    );
  }

  try {
    const template = await prisma.$transaction(async (tx) =>
      createWorkflowTemplateWithRelations(
        {
          organisationId,
          createdById,
          name: input.name,
          description: input.description,
          category: input.category,
          fields: input.fields,
          steps: input.steps,
        },
        tx,
      ),
    );

    logger.info(
      {
        origin: "api",
        event: "workflow_template.created",
        organisationId,
        workflowTemplateId: template.id,
        createdById,
        fieldsCount: template.fieldsCount,
        stepsCount: template.stepsCount,
      },
      `[API] Workflow template "${template.name}" created`,
    );

    return template;
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new ConflictError(
        "A workflow template with this name already exists in this organisation",
      );
    }

    throw error;
  }
}

export async function listWorkflowTemplates(
  organisationId: string,
  query: ListWorkflowTemplatesQuery,
): Promise<PaginatedWorkflowTemplatesResponse> {
  const filters = {
    search: query.search,
    status: query.status,
    category: query.category,
    page: query.page,
    limit: query.limit,
  };

  const [templates, total] = await Promise.all([
    findWorkflowTemplatesByOrganisation(organisationId, filters),
    countWorkflowTemplatesByOrganisation(organisationId, filters),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

  return {
    items: templates.map(toWorkflowTemplateListItem),
    page: query.page,
    limit: query.limit,
    total,
    totalPages,
  };
}

export async function getWorkflowTemplateById(
  organisationId: string,
  workflowTemplateId: string,
): Promise<WorkflowTemplateDetailResponse> {
  const template = await findWorkflowTemplateByIdInOrganisation(
    workflowTemplateId,
    organisationId,
  );

  if (!template) {
    throw new NotFoundError("Workflow template not found");
  }

  return toWorkflowTemplateDetailResponse(template);
}
