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
