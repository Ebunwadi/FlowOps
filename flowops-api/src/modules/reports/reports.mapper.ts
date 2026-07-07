import type { WorkflowRequestStatus } from "../../generated/prisma/client";

export interface ReportsSummaryFilters {
  fromDate: string | null;
  toDate: string | null;
}

export interface ReportsStatusCount {
  status: WorkflowRequestStatus;
  count: number;
}

export interface ReportsWorkflowCount {
  workflowTemplateId: string;
  workflowName: string;
  count: number;
}

export interface ReportsMonthlyCount {
  month: string;
  count: number;
}

export interface ReportsSummaryResponse {
  filters: ReportsSummaryFilters;
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  rejectedRequests: number;
  averageApprovalTimeHours: number | null;
  overdueRequests: number;
  requestsByStatus: ReportsStatusCount[];
  requestsByWorkflow: ReportsWorkflowCount[];
  requestsCreatedPerMonth: ReportsMonthlyCount[];
}

export function toReportsSummaryResponse(input: {
  fromDate?: Date;
  toDate?: Date;
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  rejectedRequests: number;
  averageApprovalTimeHours: number | null;
  overdueRequests: number;
  requestsByStatus: ReportsStatusCount[];
  requestsByWorkflow: ReportsWorkflowCount[];
  requestsCreatedPerMonth: ReportsMonthlyCount[];
}): ReportsSummaryResponse {
  return {
    filters: {
      fromDate: input.fromDate ? input.fromDate.toISOString() : null,
      toDate: input.toDate ? input.toDate.toISOString() : null,
    },
    totalRequests: input.totalRequests,
    pendingRequests: input.pendingRequests,
    completedRequests: input.completedRequests,
    rejectedRequests: input.rejectedRequests,
    averageApprovalTimeHours: input.averageApprovalTimeHours,
    overdueRequests: input.overdueRequests,
    requestsByStatus: input.requestsByStatus,
    requestsByWorkflow: input.requestsByWorkflow,
    requestsCreatedPerMonth: input.requestsCreatedPerMonth,
  };
}
