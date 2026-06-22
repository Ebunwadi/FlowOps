import type { DbClient } from "../../common/types/database";
import { prisma } from "../../config/database";
import type { WorkflowRequestStatus } from "../../generated/prisma/client";
import type { ValidatedRequestValue } from "./workflow-request.validator";

const templateForSubmissionSelect = {
  id: true,
  name: true,
  status: true,
  fields: {
    select: {
      id: true,
      fieldKey: true,
      label: true,
      fieldType: true,
      isRequired: true,
      options: true,
    },
  },
  steps: {
    orderBy: { stepOrder: "asc" as const },
    select: {
      id: true,
      name: true,
      stepOrder: true,
      approverRoleId: true,
    },
  },
} as const;

const submittedRequestSelect = {
  id: true,
  title: true,
  status: true,
  submittedAt: true,
  currentStep: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

const draftRequestSelect = {
  id: true,
  workflowTemplateId: true,
  title: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  values: {
    select: {
      workflowFieldId: true,
      value: true,
    },
  },
} as const;

const requestForMutationSelect = {
  id: true,
  requesterId: true,
  status: true,
  workflowTemplateId: true,
  title: true,
  values: {
    select: {
      workflowFieldId: true,
      value: true,
    },
  },
} as const;

const requestListSelect = {
  id: true,
  title: true,
  status: true,
  submittedAt: true,
  createdAt: true,
  updatedAt: true,
  workflowTemplate: {
    select: {
      id: true,
      name: true,
    },
  },
  requester: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  currentStep: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

export interface ListWorkflowRequestsFilters {
  requesterId?: string;
  status?: WorkflowRequestStatus;
  workflowTemplateId?: string;
  search?: string;
  page: number;
  limit: number;
}

function buildWorkflowRequestListWhere(
  organisationId: string,
  filters: Pick<
    ListWorkflowRequestsFilters,
    "requesterId" | "status" | "workflowTemplateId" | "search"
  >,
) {
  return {
    organisationId,
    ...(filters.requesterId ? { requesterId: filters.requesterId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.workflowTemplateId
      ? { workflowTemplateId: filters.workflowTemplateId }
      : {}),
    ...(filters.search
      ? {
          OR: [
            {
              title: {
                contains: filters.search,
                mode: "insensitive" as const,
              },
            },
            {
              workflowTemplate: {
                name: {
                  contains: filters.search,
                  mode: "insensitive" as const,
                },
              },
            },
          ],
        }
      : {}),
  };
}

export async function findWorkflowRequests(
  organisationId: string,
  filters: ListWorkflowRequestsFilters,
  db: DbClient = prisma,
) {
  const skip = (filters.page - 1) * filters.limit;

  return db.workflowRequest.findMany({
    where: buildWorkflowRequestListWhere(organisationId, filters),
    select: requestListSelect,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    skip,
    take: filters.limit,
  });
}

export async function countWorkflowRequests(
  organisationId: string,
  filters: Pick<
    ListWorkflowRequestsFilters,
    "requesterId" | "status" | "workflowTemplateId" | "search"
  >,
  db: DbClient = prisma,
) {
  return db.workflowRequest.count({
    where: buildWorkflowRequestListWhere(organisationId, filters),
  });
}

export async function findTemplateForRequestSubmission(
  workflowTemplateId: string,
  organisationId: string,
  db: DbClient = prisma,
) {
  return db.workflowTemplate.findFirst({
    where: {
      id: workflowTemplateId,
      organisationId,
    },
    select: templateForSubmissionSelect,
  });
}

export interface CreateWorkflowRequestRecordInput {
  organisationId: string;
  workflowTemplateId: string;
  requesterId: string;
  currentStepId: string | null;
  status: WorkflowRequestStatus;
  title?: string;
  submittedAt: Date | null;
  values: ValidatedRequestValue[];
}

export async function createWorkflowRequestWithValues(
  input: CreateWorkflowRequestRecordInput,
  db: DbClient,
) {
  return db.workflowRequest.create({
    data: {
      organisationId: input.organisationId,
      workflowTemplateId: input.workflowTemplateId,
      requesterId: input.requesterId,
      currentStepId: input.currentStepId,
      status: input.status,
      title: input.title,
      submittedAt: input.submittedAt,
      values: {
        create: input.values.map((value) => ({
          workflowFieldId: value.workflowFieldId,
          value: value.value,
        })),
      },
    },
    select: submittedRequestSelect,
  });
}

export async function findWorkflowRequestForMutation(
  workflowRequestId: string,
  organisationId: string,
  db: DbClient = prisma,
) {
  return db.workflowRequest.findFirst({
    where: {
      id: workflowRequestId,
      organisationId,
    },
    select: requestForMutationSelect,
  });
}

export interface CreateDraftWorkflowRequestRecordInput {
  organisationId: string;
  workflowTemplateId: string;
  requesterId: string;
  title?: string;
  values: ValidatedRequestValue[];
}

export async function createDraftWorkflowRequestRecord(
  input: CreateDraftWorkflowRequestRecordInput,
  db: DbClient,
) {
  return db.workflowRequest.create({
    data: {
      organisationId: input.organisationId,
      workflowTemplateId: input.workflowTemplateId,
      requesterId: input.requesterId,
      status: "DRAFT",
      title: input.title,
      submittedAt: null,
      currentStepId: null,
      values: {
        create: input.values.map((value) => ({
          workflowFieldId: value.workflowFieldId,
          value: value.value,
        })),
      },
    },
    select: draftRequestSelect,
  });
}

export interface UpdateDraftWorkflowRequestRecordInput {
  workflowRequestId: string;
  title?: string;
  values?: ValidatedRequestValue[];
}

export async function updateDraftWorkflowRequestRecord(
  input: UpdateDraftWorkflowRequestRecordInput,
  db: DbClient,
) {
  await db.workflowRequest.update({
    where: { id: input.workflowRequestId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
    },
  });

  if (input.values) {
    await replaceRequestValues(input.workflowRequestId, input.values, db);
  }

  return db.workflowRequest.findFirst({
    where: { id: input.workflowRequestId },
    select: draftRequestSelect,
  });
}

export interface SubmitDraftWorkflowRequestRecordInput {
  workflowRequestId: string;
  currentStepId: string;
  submittedAt: Date;
  values: ValidatedRequestValue[];
}

export async function submitDraftWorkflowRequestRecord(
  input: SubmitDraftWorkflowRequestRecordInput,
  db: DbClient,
) {
  await replaceRequestValues(input.workflowRequestId, input.values, db);

  return db.workflowRequest.update({
    where: { id: input.workflowRequestId },
    data: {
      status: "PENDING_APPROVAL",
      currentStepId: input.currentStepId,
      submittedAt: input.submittedAt,
    },
    select: submittedRequestSelect,
  });
}

async function replaceRequestValues(
  workflowRequestId: string,
  values: ValidatedRequestValue[],
  db: DbClient,
): Promise<void> {
  await db.workflowRequestValue.deleteMany({
    where: { workflowRequestId },
  });

  if (values.length > 0) {
    await db.workflowRequestValue.createMany({
      data: values.map((value) => ({
        workflowRequestId,
        workflowFieldId: value.workflowFieldId,
        value: value.value,
      })),
    });
  }
}
