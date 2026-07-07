import {
  toReportsSummaryResponse,
  type ReportsMonthlyCount,
  type ReportsStatusCount,
  type ReportsSummaryResponse,
  type ReportsWorkflowCount,
} from "./reports.mapper";
import {
  countRequestsByStatus,
  findCompletedRequestsForApprovalDuration,
  findPendingRequestsForOverdueCalculation,
  findSubmittedRequestDatesForMonthlyVolume,
  findWorkflowTemplateNamesByIds,
  groupRequestsByStatus,
  groupRequestsByWorkflowTemplate,
  type ReportsDateRange,
} from "./reports.repository";
import type { ReportsSummaryQuery } from "./reports.validation";

function aggregateRequestsByMonth(
  requests: Array<{ submittedAt: Date | null }>,
): ReportsMonthlyCount[] {
  const countsByMonth = new Map<string, number>();

  for (const request of requests) {
    if (!request.submittedAt) {
      continue;
    }

    const month = request.submittedAt.toISOString().slice(0, 7);
    countsByMonth.set(month, (countsByMonth.get(month) ?? 0) + 1);
  }

  return [...countsByMonth.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, count]) => ({ month, count }));
}

function calculateAverageApprovalTimeHours(
  requests: Array<{ submittedAt: Date | null; completedAt: Date | null }>,
): number | null {
  const durationsMs = requests
    .filter(
      (request): request is { submittedAt: Date; completedAt: Date } =>
        request.submittedAt !== null && request.completedAt !== null,
    )
    .map(
      (request) => request.completedAt.getTime() - request.submittedAt.getTime(),
    )
    .filter((duration) => duration >= 0);

  if (durationsMs.length === 0) {
    return null;
  }

  const averageMs =
    durationsMs.reduce((total, duration) => total + duration, 0) /
    durationsMs.length;

  return Math.round((averageMs / (60 * 60 * 1000)) * 100) / 100;
}

function countOverdueRequests(
  requests: Array<{
    submittedAt: Date | null;
    currentStep: { slaHours: number | null } | null;
  }>,
  now = new Date(),
): number {
  return requests.filter((request) => {
    if (!request.submittedAt || !request.currentStep?.slaHours) {
      return false;
    }

    if (request.currentStep.slaHours <= 0) {
      return false;
    }

    const dueAt = new Date(
      request.submittedAt.getTime() +
        request.currentStep.slaHours * 60 * 60 * 1000,
    );

    return dueAt.getTime() < now.getTime();
  }).length;
}

function toDateRange(query: ReportsSummaryQuery): ReportsDateRange {
  return {
    fromDate: query.fromDate,
    toDate: query.toDate,
  };
}

export async function getReportsSummary(
  organisationId: string,
  query: ReportsSummaryQuery,
): Promise<ReportsSummaryResponse> {
  const range = toDateRange(query);

  const [
    totalRequests,
    pendingRequests,
    completedRequests,
    rejectedRequests,
    statusGroups,
    workflowGroups,
    monthlyRequestDates,
    completedDurationRequests,
    pendingOverdueCandidates,
  ] = await Promise.all([
    countRequestsByStatus(organisationId, range),
    countRequestsByStatus(organisationId, range, "PENDING_APPROVAL"),
    countRequestsByStatus(organisationId, range, "APPROVED"),
    countRequestsByStatus(organisationId, range, "REJECTED"),
    groupRequestsByStatus(organisationId, range),
    groupRequestsByWorkflowTemplate(organisationId, range),
    findSubmittedRequestDatesForMonthlyVolume(organisationId, range),
    findCompletedRequestsForApprovalDuration(organisationId, range),
    findPendingRequestsForOverdueCalculation(organisationId, range),
  ]);

  const templateIds = workflowGroups.map((group) => group.workflowTemplateId);
  const templates = await findWorkflowTemplateNamesByIds(templateIds);
  const templateNameById = new Map(
    templates.map((template) => [template.id, template.name]),
  );

  const requestsByStatus: ReportsStatusCount[] = statusGroups.map((group) => ({
    status: group.status,
    count: group._count.id,
  }));

  const requestsByWorkflow: ReportsWorkflowCount[] = workflowGroups.map(
    (group) => ({
      workflowTemplateId: group.workflowTemplateId,
      workflowName:
        templateNameById.get(group.workflowTemplateId) ?? "Unknown workflow",
      count: group._count.id,
    }),
  );

  return toReportsSummaryResponse({
    fromDate: query.fromDate,
    toDate: query.toDate,
    totalRequests,
    pendingRequests,
    completedRequests,
    rejectedRequests,
    averageApprovalTimeHours:
      calculateAverageApprovalTimeHours(completedDurationRequests),
    overdueRequests: countOverdueRequests(pendingOverdueCandidates),
    requestsByStatus,
    requestsByWorkflow,
    requestsCreatedPerMonth: aggregateRequestsByMonth(monthlyRequestDates),
  });
}
