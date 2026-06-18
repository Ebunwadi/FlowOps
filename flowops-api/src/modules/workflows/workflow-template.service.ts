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
  updateWorkflowTemplateWithRelations,
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
  type UpdateWorkflowTemplateBody,
} from "./workflow-template.validation";

async function assertApproverRolesBelongToOrganisation(
  organisationId: string,
  steps: Array<{ approverRoleId: string }>,
): Promise<void> {
  const approverRoleIds = [...new Set(steps.map((step) => step.approverRoleId))];
  const organisationRoles = await findRolesByIdsInOrganisation(
    organisationId,
    approverRoleIds,
  );

  if (organisationRoles.length !== approverRoleIds.length) {
    throw new NotFoundError(
      "One or more approver roles were not found in this organisation",
    );
  }
}

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

  await assertApproverRolesBelongToOrganisation(organisationId, input.steps);

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

export async function updateWorkflowTemplate(
  organisationId: string,
  workflowTemplateId: string,
  input: UpdateWorkflowTemplateBody,
): Promise<WorkflowTemplateDetailResponse> {
  const existingTemplate = await findWorkflowTemplateByIdInOrganisation(
    workflowTemplateId,
    organisationId,
  );

  if (!existingTemplate) {
    throw new NotFoundError("Workflow template not found");
  }

  if (input.fields) {
    assertUniqueWorkflowFields(input.fields);
  }

  if (input.steps) {
    assertUniqueWorkflowSteps(input.steps);
  }

  if (input.name) {
    const duplicateTemplate = await findWorkflowTemplateByNameInOrganisation(
      organisationId,
      input.name,
      workflowTemplateId,
    );

    if (duplicateTemplate) {
      throw new ConflictError(
        "A workflow template with this name already exists in this organisation",
      );
    }
  }

  if (input.steps) {
    await assertApproverRolesBelongToOrganisation(organisationId, input.steps);
  }

  try {
    const updatedTemplate = await prisma.$transaction(async (tx) =>
      updateWorkflowTemplateWithRelations(
        {
          workflowTemplateId,
          organisationId,
          name: input.name,
          description: input.description,
          category: input.category,
          fields: input.fields,
          steps: input.steps,
        },
        tx,
      ),
    );

    if (!updatedTemplate) {
      throw new NotFoundError("Workflow template not found");
    }

    logger.info(
      {
        origin: "api",
        event: "workflow_template.updated",
        organisationId,
        workflowTemplateId,
        replacedFields: input.fields !== undefined,
        replacedSteps: input.steps !== undefined,
      },
      `[API] Workflow template "${updatedTemplate.name}" updated`,
    );

    return toWorkflowTemplateDetailResponse(updatedTemplate);
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new ConflictError(
        "A workflow template with this name already exists in this organisation",
      );
    }

    throw error;
  }
}
