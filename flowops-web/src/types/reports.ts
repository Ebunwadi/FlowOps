import type { WorkflowRequestStatus } from "@/types/workflow-request";

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

export interface ReportsSummary {
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

export interface ReportsSummaryParams {
  fromDate?: string;
  toDate?: string;
}

export interface ReportsBarChartItem {
  label: string;
  value: number;
}

export function formatReportMonth(month: string): string {
  const [year, monthNumber] = month.split("-");

  if (!year || !monthNumber) {
    return month;
  }

  const date = new Date(Number(year), Number(monthNumber) - 1, 1);
  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}
