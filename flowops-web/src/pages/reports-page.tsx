import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";

import { exportReportsCsv, exportReportsPdf, getReportsSummary } from "@/api/reports";
import { useOrganisation } from "@/auth/use-organisation";
import { usePermissions } from "@/auth/use-permissions";
import { AuthLoadingScreen } from "@/components/auth/auth-loading-screen";
import { SimpleBarChart } from "@/components/reports/simple-bar-chart";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatApiErrorMessage } from "@/lib/api-errors";
import type { ReportsSummaryParams } from "@/types/reports";
import { formatReportMonth } from "@/types/reports";
import { formatWorkflowRequestStatus } from "@/types/workflow-request";

function toIsoDateStart(value: string): string {
  return new Date(`${value}T00:00:00.000`).toISOString();
}

function toIsoDateEnd(value: string): string {
  return new Date(`${value}T23:59:59.999`).toISOString();
}

function buildSummaryParams(fromDate: string, toDate: string): ReportsSummaryParams {
  return {
    ...(fromDate ? { fromDate: toIsoDateStart(fromDate) } : {}),
    ...(toDate ? { toDate: toIsoDateEnd(toDate) } : {}),
  };
}

function SummaryMetricCard({
  label,
  tone = "default",
  value,
}: {
  label: string;
  tone?: "default" | "warning";
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={
          tone === "warning"
            ? "mt-1 text-2xl font-semibold text-amber-700"
            : "mt-1 text-2xl font-semibold text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}

export function ReportsPage() {
  const { currentOrganisation } = useOrganisation();
  const { hasPermission, membershipAccessLoading } = usePermissions();
  const canViewReports = hasPermission("reports:view");
  const canExportReports = hasPermission("reports:export");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<ReportsSummaryParams>({});
  const [exportError, setExportError] = useState<string | null>(null);

  const summaryQuery = useQuery({
    queryKey: ["reports-summary", currentOrganisation?.id, appliedFilters],
    queryFn: () => getReportsSummary(appliedFilters),
    enabled: Boolean(currentOrganisation?.id) && canViewReports,
  });

  const exportCsvMutation = useMutation({
    mutationFn: () => exportReportsCsv(appliedFilters),
    onMutate: () => setExportError(null),
    onError: (error) => setExportError(formatApiErrorMessage(error)),
  });

  const exportPdfMutation = useMutation({
    mutationFn: () => exportReportsPdf(appliedFilters),
    onMutate: () => setExportError(null),
    onError: (error) => setExportError(formatApiErrorMessage(error)),
  });

  const statusChartItems = useMemo(
    () =>
      (summaryQuery.data?.requestsByStatus ?? []).map((item) => ({
        label: formatWorkflowRequestStatus(item.status),
        value: item.count,
      })),
    [summaryQuery.data?.requestsByStatus],
  );

  const workflowChartItems = useMemo(
    () =>
      (summaryQuery.data?.requestsByWorkflow ?? []).map((item) => ({
        label: item.workflowName,
        value: item.count,
      })),
    [summaryQuery.data?.requestsByWorkflow],
  );

  const monthlyChartItems = useMemo(
    () =>
      (summaryQuery.data?.requestsCreatedPerMonth ?? []).map((item) => ({
        label: formatReportMonth(item.month),
        value: item.count,
      })),
    [summaryQuery.data?.requestsCreatedPerMonth],
  );

  if (!currentOrganisation) {
    return <Navigate replace to="/organisation/setup" />;
  }

  if (membershipAccessLoading) {
    return <AuthLoadingScreen message="Checking your permissions..." />;
  }

  if (!canViewReports) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You do not have permission to view organisation reports.
          </p>
        </div>
        <DismissibleAlert variant="warning">
          Contact an organisation admin if you need access to analytics and exports.
        </DismissibleAlert>
      </div>
    );
  }

  const handleApplyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (fromDate && toDate && fromDate > toDate) {
      return;
    }

    setAppliedFilters(buildSummaryParams(fromDate, toDate));
  };

  const handleClearFilters = () => {
    setFromDate("");
    setToDate("");
    setAppliedFilters({});
  };

  const summary = summaryQuery.data;
  const averageApprovalTime =
    summary?.averageApprovalTimeHours === null ||
    summary?.averageApprovalTimeHours === undefined
      ? "—"
      : `${summary.averageApprovalTimeHours}h`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Analytics and exports for workflow requests in {currentOrganisation.name}.
          </p>
        </div>

        {canExportReports ? (
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={exportCsvMutation.isPending || exportPdfMutation.isPending}
              onClick={() => exportCsvMutation.mutate()}
              type="button"
              variant="outline"
            >
              {exportCsvMutation.isPending ? "Exporting CSV…" : "Export CSV"}
            </Button>
            <Button
              disabled={exportCsvMutation.isPending || exportPdfMutation.isPending}
              onClick={() => exportPdfMutation.mutate()}
              type="button"
              variant="outline"
            >
              {exportPdfMutation.isPending ? "Exporting PDF…" : "Export PDF"}
            </Button>
          </div>
        ) : null}
      </div>

      {exportError ? (
        <DismissibleAlert variant="error">{exportError}</DismissibleAlert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Date range</CardTitle>
          <CardDescription>
            Filter submitted requests included in the summary and exports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-[1fr_1fr_auto_auto]"
            onSubmit={handleApplyFilters}
          >
            <div className="space-y-2">
              <Label htmlFor="reports-from-date">From</Label>
              <Input
                id="reports-from-date"
                onChange={(event) => setFromDate(event.target.value)}
                type="date"
                value={fromDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reports-to-date">To</Label>
              <Input
                id="reports-to-date"
                onChange={(event) => setToDate(event.target.value)}
                type="date"
                value={toDate}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit">Apply</Button>
            </div>
            <div className="flex items-end">
              <Button onClick={handleClearFilters} type="button" variant="outline">
                Clear
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {summaryQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading report metrics…</p>
      ) : summaryQuery.isError ? (
        <DismissibleAlert variant="error">
          {formatApiErrorMessage(summaryQuery.error)}
        </DismissibleAlert>
      ) : summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryMetricCard label="Total requests" value={String(summary.totalRequests)} />
            <SummaryMetricCard
              label="Pending requests"
              value={String(summary.pendingRequests)}
            />
            <SummaryMetricCard
              label="Completed requests"
              value={String(summary.completedRequests)}
            />
            <SummaryMetricCard
              label="Rejected requests"
              value={String(summary.rejectedRequests)}
            />
            <SummaryMetricCard
              label="Overdue requests"
              tone={summary.overdueRequests > 0 ? "warning" : "default"}
              value={String(summary.overdueRequests)}
            />
            <SummaryMetricCard
              label="Average approval time"
              value={averageApprovalTime}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Requests by status</CardTitle>
                <CardDescription>
                  Distribution of submitted requests across workflow statuses.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleBarChart items={statusChartItems} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Requests by workflow</CardTitle>
                <CardDescription>
                  Volume grouped by workflow template.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleBarChart items={workflowChartItems} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Monthly request volume</CardTitle>
              <CardDescription>
                Submitted requests created per month for the selected range.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleBarChart items={monthlyChartItems} />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
