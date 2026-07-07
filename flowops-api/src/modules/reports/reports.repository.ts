import type { WorkflowRequestStatus } from "../../generated/prisma/client";
import { prisma } from "../../config/database";

export interface ReportsDateRange {
  fromDate?: Date;
  toDate?: Date;
}

function endOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function buildSubmittedRequestDateFilter(range: ReportsDateRange) {
  if (!range.fromDate && !range.toDate) {
    return {
      submittedAt: { not: null },
    };
  }

  return {
    submittedAt: {
      not: null,
      ...(range.fromDate ? { gte: range.fromDate } : {}),
      ...(range.toDate ? { lte: endOfDay(range.toDate) } : {}),
    },
  };
}

export async function countRequestsByStatus(
  organisationId: string,
  range: ReportsDateRange,
  status?: WorkflowRequestStatus,
) {
  return prisma.workflowRequest.count({
    where: {
      organisationId,
      ...buildSubmittedRequestDateFilter(range),
      ...(status ? { status } : {}),
    },
  });
}

export async function groupRequestsByStatus(
  organisationId: string,
  range: ReportsDateRange,
) {
  return prisma.workflowRequest.groupBy({
    by: ["status"],
    where: {
      organisationId,
      ...buildSubmittedRequestDateFilter(range),
    },
    _count: {
      id: true,
    },
    orderBy: {
      status: "asc",
    },
  });
}

export async function groupRequestsByWorkflowTemplate(
  organisationId: string,
  range: ReportsDateRange,
) {
  return prisma.workflowRequest.groupBy({
    by: ["workflowTemplateId"],
    where: {
      organisationId,
      ...buildSubmittedRequestDateFilter(range),
    },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: "desc",
      },
    },
  });
}

export async function findWorkflowTemplateNamesByIds(templateIds: string[]) {
  if (templateIds.length === 0) {
    return [];
  }

  return prisma.workflowTemplate.findMany({
    where: {
      id: { in: templateIds },
    },
    select: {
      id: true,
      name: true,
    },
  });
}

export async function findSubmittedRequestDatesForMonthlyVolume(
  organisationId: string,
  range: ReportsDateRange,
) {
  return prisma.workflowRequest.findMany({
    where: {
      organisationId,
      ...buildSubmittedRequestDateFilter(range),
    },
    select: {
      submittedAt: true,
    },
  });
}

export async function findCompletedRequestsForApprovalDuration(
  organisationId: string,
  range: ReportsDateRange,
) {
  return prisma.workflowRequest.findMany({
    where: {
      organisationId,
      status: "APPROVED",
      completedAt: { not: null },
      ...buildSubmittedRequestDateFilter(range),
    },
    select: {
      submittedAt: true,
      completedAt: true,
    },
  });
}

export async function findPendingRequestsForOverdueCalculation(
  organisationId: string,
  range: ReportsDateRange,
) {
  return prisma.workflowRequest.findMany({
    where: {
      organisationId,
      status: "PENDING_APPROVAL",
      currentStepId: { not: null },
      ...buildSubmittedRequestDateFilter(range),
    },
    select: {
      submittedAt: true,
      currentStep: {
        select: {
          slaHours: true,
        },
      },
    },
  });
}

export async function findReportExportRequests(
  organisationId: string,
  range: ReportsDateRange,
) {
  return prisma.workflowRequest.findMany({
    where: {
      organisationId,
      ...buildSubmittedRequestDateFilter(range),
    },
    select: {
      id: true,
      title: true,
      status: true,
      submittedAt: true,
      completedAt: true,
      updatedAt: true,
      workflowTemplate: {
        select: {
          name: true,
        },
      },
      requester: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      currentStep: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
  });
}
