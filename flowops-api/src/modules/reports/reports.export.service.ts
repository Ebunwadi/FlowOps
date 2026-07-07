import { buildRequestsCsvContent } from "./reports.export.csv";
import { buildRequestsPdfBuffer } from "./reports.export.pdf";
import type {
  ReportExportRequestRow,
  ReportFileExport,
} from "./reports.export.types";
import { getReportsSummary } from "./reports.service";
import { findReportExportRequests, type ReportsDateRange } from "./reports.repository";
import type { ReportsSummaryQuery } from "./reports.validation";

function formatRequesterName(requester: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const parts = [requester.firstName, requester.lastName].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(" ");
  }

  return requester.email;
}

function toExportRow(
  request: Awaited<ReturnType<typeof findReportExportRequests>>[number],
): ReportExportRequestRow {
  return {
    id: request.id,
    title: request.title,
    workflowName: request.workflowTemplate.name,
    requesterName: formatRequesterName(request.requester),
    status: request.status,
    currentStepName: request.currentStep?.name ?? null,
    submittedAt: request.submittedAt ? request.submittedAt.toISOString() : null,
    completedAt: request.completedAt ? request.completedAt.toISOString() : null,
    updatedAt: request.updatedAt.toISOString(),
  };
}

function buildExportFileName(extension: "csv" | "pdf", generatedAt: Date): string {
  const datePart = generatedAt.toISOString().slice(0, 10);
  return `workflow-requests-report-${datePart}.${extension}`;
}

function toDateRange(query: ReportsSummaryQuery): ReportsDateRange {
  return {
    fromDate: query.fromDate,
    toDate: query.toDate,
  };
}

async function loadExportRows(
  organisationId: string,
  query: ReportsSummaryQuery,
): Promise<ReportExportRequestRow[]> {
  const requests = await findReportExportRequests(
    organisationId,
    toDateRange(query),
  );

  return requests.map(toExportRow);
}

export async function buildRequestsCsvExport(
  organisationId: string,
  organisationName: string,
  query: ReportsSummaryQuery,
  generatedAt = new Date(),
): Promise<ReportFileExport> {
  const rows = await loadExportRows(organisationId, query);
  const csv = buildRequestsCsvContent(rows);

  return {
    fileName: buildExportFileName("csv", generatedAt),
    content: Buffer.from(csv, "utf-8"),
    contentType: "text/csv; charset=utf-8",
  };
}

export async function buildRequestsPdfExport(
  organisationId: string,
  organisationName: string,
  query: ReportsSummaryQuery,
  generatedAt = new Date(),
): Promise<ReportFileExport> {
  const [rows, summary] = await Promise.all([
    loadExportRows(organisationId, query),
    getReportsSummary(organisationId, query),
  ]);

  const content = await buildRequestsPdfBuffer({
    organisationName,
    generatedAt,
    summary: {
      totalRequests: summary.totalRequests,
      pendingRequests: summary.pendingRequests,
      completedRequests: summary.completedRequests,
      rejectedRequests: summary.rejectedRequests,
      averageApprovalTimeHours: summary.averageApprovalTimeHours,
      overdueRequests: summary.overdueRequests,
    },
    rows,
  });

  return {
    fileName: buildExportFileName("pdf", generatedAt),
    content,
    contentType: "application/pdf",
  };
}
