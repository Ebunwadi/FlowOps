import type { ApprovalDecision } from "../../generated/prisma/client";
import type { DbClient } from "../../common/types/database";
import { prisma } from "../../config/database";

const pendingApprovalSelect = {
  id: true,
  title: true,
  status: true,
  submittedAt: true,
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
      slaHours: true,
      approverRoleId: true,
    },
  },
} as const;

export interface ListPendingApprovalsFilters {
  approverRoleId?: string;
  search?: string;
  page: number;
  limit: number;
}

function buildPendingApprovalsWhere(
  organisationId: string,
  filters: Pick<ListPendingApprovalsFilters, "approverRoleId" | "search">,
) {
  return {
    organisationId,
    status: "PENDING_APPROVAL" as const,
    currentStepId: { not: null },
    ...(filters.approverRoleId
      ? { currentStep: { approverRoleId: filters.approverRoleId } }
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
            {
              requester: {
                OR: [
                  {
                    email: {
                      contains: filters.search,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    firstName: {
                      contains: filters.search,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    lastName: {
                      contains: filters.search,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              },
            },
          ],
        }
      : {}),
  };
}

export async function findPendingApprovals(
  organisationId: string,
  filters: ListPendingApprovalsFilters,
  db: DbClient = prisma,
) {
  const skip = (filters.page - 1) * filters.limit;

  return db.workflowRequest.findMany({
    where: buildPendingApprovalsWhere(organisationId, filters),
    select: pendingApprovalSelect,
    orderBy: [{ submittedAt: "asc" }, { updatedAt: "desc" }],
    skip,
    take: filters.limit,
  });
}

export async function countPendingApprovals(
  organisationId: string,
  filters: Pick<ListPendingApprovalsFilters, "approverRoleId" | "search">,
  db: DbClient = prisma,
) {
  return db.workflowRequest.count({
    where: buildPendingApprovalsWhere(organisationId, filters),
  });
}

export type PendingApprovalRecord = NonNullable<
  Awaited<ReturnType<typeof findPendingApprovals>>[number]
>;

const requestForApprovalSelect = {
  id: true,
  organisationId: true,
  workflowTemplateId: true,
  requesterId: true,
  title: true,
  status: true,
  currentStepId: true,
  currentStep: {
    select: {
      id: true,
      name: true,
      stepOrder: true,
      approverRoleId: true,
    },
  },
  workflowTemplate: {
    select: {
      id: true,
      name: true,
      steps: {
        orderBy: { stepOrder: "asc" as const },
        select: {
          id: true,
          name: true,
          stepOrder: true,
          approverRoleId: true,
        },
      },
    },
  },
} as const;

const approvedRequestSelect = {
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

export async function findWorkflowRequestForApproval(
  workflowRequestId: string,
  organisationId: string,
  db: DbClient = prisma,
) {
  return db.workflowRequest.findFirst({
    where: {
      id: workflowRequestId,
      organisationId,
    },
    select: requestForApprovalSelect,
  });
}

export async function findApprovalDecisionForStep(
  workflowRequestId: string,
  workflowStepId: string,
  db: DbClient = prisma,
) {
  return db.approval.findFirst({
    where: {
      workflowRequestId,
      workflowStepId,
    },
    orderBy: { decidedAt: "desc" },
    select: {
      id: true,
      decision: true,
    },
  });
}

export async function findBlockingApprovalDecisionForStep(
  workflowRequestId: string,
  workflowStepId: string,
  requestStatus: "PENDING_APPROVAL" | "CHANGES_REQUESTED" | "APPROVED" | "REJECTED" | "DRAFT" | "SUBMITTED" | "CANCELLED",
  db: DbClient = prisma,
) {
  const latestDecision = await findApprovalDecisionForStep(
    workflowRequestId,
    workflowStepId,
    db,
  );

  if (!latestDecision) {
    return null;
  }

  if (
    latestDecision.decision === "CHANGES_REQUESTED" &&
    requestStatus === "PENDING_APPROVAL"
  ) {
    return null;
  }

  return latestDecision;
}

export async function findLatestChangesRequestedStepId(
  workflowRequestId: string,
  db: DbClient = prisma,
) {
  const approval = await db.approval.findFirst({
    where: {
      workflowRequestId,
      decision: "CHANGES_REQUESTED",
    },
    orderBy: { decidedAt: "desc" },
    select: {
      workflowStepId: true,
    },
  });

  return approval?.workflowStepId ?? null;
}

export async function createApprovalDecision(
  input: {
    workflowRequestId: string;
    workflowStepId: string;
    approverId: string;
    decision: ApprovalDecision;
    comment?: string;
  },
  db: DbClient,
) {
  return db.approval.create({
    data: {
      workflowRequestId: input.workflowRequestId,
      workflowStepId: input.workflowStepId,
      approverId: input.approverId,
      decision: input.decision,
      comment: input.comment,
    },
  });
}

export async function applyWorkflowRequestApproval(
  input: {
    workflowRequestId: string;
    nextStepId: string | null;
    status: "PENDING_APPROVAL" | "APPROVED";
    completedAt: Date | null;
  },
  db: DbClient,
) {
  return db.workflowRequest.update({
    where: { id: input.workflowRequestId },
    data: {
      currentStepId: input.nextStepId,
      status: input.status,
      ...(input.completedAt ? { completedAt: input.completedAt } : {}),
    },
    select: approvedRequestSelect,
  });
}

export async function applyWorkflowRequestRejection(
  workflowRequestId: string,
  db: DbClient,
) {
  return db.workflowRequest.update({
    where: { id: workflowRequestId },
    data: {
      status: "REJECTED",
      currentStepId: null,
    },
    select: approvedRequestSelect,
  });
}

export async function applyWorkflowRequestChangesRequested(
  workflowRequestId: string,
  db: DbClient,
) {
  return db.workflowRequest.update({
    where: { id: workflowRequestId },
    data: {
      status: "CHANGES_REQUESTED",
    },
    select: approvedRequestSelect,
  });
}
