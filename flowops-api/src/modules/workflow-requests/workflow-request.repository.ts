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
