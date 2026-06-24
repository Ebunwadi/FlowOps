import { apiClient } from "@/api/client";
import type {
  ListPendingApprovalsParams,
  PaginatedPendingApprovalsResponse,
} from "@/types/approval";

function buildQueryString(params: ListPendingApprovalsParams): string {
  const searchParams = new URLSearchParams();

  if (params.search) {
    searchParams.set("search", params.search);
  }

  if (params.page !== undefined) {
    searchParams.set("page", String(params.page));
  }

  if (params.limit !== undefined) {
    searchParams.set("limit", String(params.limit));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function listPendingApprovals(
  params: ListPendingApprovalsParams = {},
): Promise<PaginatedPendingApprovalsResponse> {
  return apiClient<PaginatedPendingApprovalsResponse>(
    `/approvals/pending${buildQueryString(params)}`,
  );
}
