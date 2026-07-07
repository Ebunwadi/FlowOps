import { getRegisteredAccessToken } from "@/auth/token-access";
import { getRegisteredOrganisationId } from "@/auth/organisation-context-access";
import { apiClient } from "@/api/client";
import { env } from "@/config/env";
import { ApiClientError, type ApiResponse } from "@/types/api";
import type { ReportsSummary, ReportsSummaryParams } from "@/types/reports";

function buildReportsQueryString(params: ReportsSummaryParams = {}): string {
  const searchParams = new URLSearchParams();

  if (params.fromDate) {
    searchParams.set("fromDate", params.fromDate);
  }

  if (params.toDate) {
    searchParams.set("toDate", params.toDate);
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function getReportsSummary(
  params: ReportsSummaryParams = {},
): Promise<ReportsSummary> {
  return apiClient<ReportsSummary>(`/reports/summary${buildReportsQueryString(params)}`);
}

function parseContentDispositionFileName(header: string | null): string | null {
  if (!header) {
    return null;
  }

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const basicMatch = header.match(/filename="([^"]+)"/i);
  return basicMatch?.[1] ?? null;
}

async function downloadReportFile(path: string, fallbackFileName: string): Promise<void> {
  const accessToken = await getRegisteredAccessToken();
  const organisationId = getRegisteredOrganisationId();

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(organisationId ? { "x-organisation-id": organisationId } : {}),
    },
  });

  if (!response.ok) {
    let message = "Failed to download report";

    try {
      const payload = (await response.json()) as ApiResponse<unknown>;

      if (payload.success === false) {
        message = payload.message;
      }
    } catch {
      // Non-JSON error body; keep generic message.
    }

    throw new ApiClientError(message, response.status);
  }

  const blob = await response.blob();
  const fileName =
    parseContentDispositionFileName(response.headers.get("Content-Disposition")) ??
    fallbackFileName;
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export function exportReportsCsv(params: ReportsSummaryParams = {}): Promise<void> {
  return downloadReportFile(
    `/reports/requests.csv${buildReportsQueryString(params)}`,
    "workflow-requests-report.csv",
  );
}

export function exportReportsPdf(params: ReportsSummaryParams = {}): Promise<void> {
  return downloadReportFile(
    `/reports/requests.pdf${buildReportsQueryString(params)}`,
    "workflow-requests-report.pdf",
  );
}
