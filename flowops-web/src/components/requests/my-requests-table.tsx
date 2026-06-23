import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

import { listMyWorkflowRequests } from "@/api/workflow-requests";
import { Button } from "@/components/ui/button";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatApiErrorMessage } from "@/lib/api-errors";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import {
  formatWorkflowRequestDate,
  formatWorkflowRequestStatus,
  WORKFLOW_REQUEST_STATUSES,
  type WorkflowRequestListItem,
  type WorkflowRequestStatus,
} from "@/types/workflow-request";

import { WorkflowRequestStatusBadge } from "./workflow-request-status-badge";

const PAGE_SIZE = 20;

export function MyRequestsTable() {
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | WorkflowRequestStatus>("");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(searchInput.trim());

  const requestsQuery = useQuery({
    queryKey: ["my-workflow-requests", debouncedSearch, statusFilter, page],
    queryFn: () =>
      listMyWorkflowRequests({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        page,
        limit: PAGE_SIZE,
      }),
  });

  if (requestsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <RequestsFiltersSkeleton />
        <RequestsTableSkeleton />
      </div>
    );
  }

  if (requestsQuery.isError) {
    return (
      <div className="space-y-4">
        <RequestsFilters
          searchInput={searchInput}
          statusFilter={statusFilter}
          onSearchChange={(value) => {
            setSearchInput(value);
            setPage(1);
          }}
          onStatusChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        />
        <DismissibleAlert
          className="text-center"
          messageKey={formatApiErrorMessage(requestsQuery.error)}
          variant="error"
        >
          <h3 className="text-sm font-medium text-red-900">
            Unable to load your requests
          </h3>
          <p className="mt-1 text-sm text-red-700">
            {formatApiErrorMessage(requestsQuery.error)}
          </p>
          <Button
            className="mt-4"
            onClick={() => {
              void requestsQuery.refetch();
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            Try again
          </Button>
        </DismissibleAlert>
      </div>
    );
  }

  const data = requestsQuery.data;

  if (!data) {
    return null;
  }

  const { items, total, totalPages } = data;
  const hasActiveFilters = debouncedSearch.length > 0 || statusFilter.length > 0;

  return (
    <div className="space-y-4">
      <RequestsFilters
        searchInput={searchInput}
        statusFilter={statusFilter}
        onSearchChange={(value) => {
          setSearchInput(value);
          setPage(1);
        }}
        onStatusChange={(value) => {
          setStatusFilter(value);
          setPage(1);
        }}
      />

      {items.length === 0 ? (
        <RequestsEmptyState hasActiveFilters={hasActiveFilters} />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Request
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Workflow
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Current step
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Last updated
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((request) => (
                    <RequestRow key={request.id} request={request} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, total)} of {total} requests
              </p>
              <div className="flex items-center gap-2">
                <Button
                  disabled={page <= 1}
                  onClick={() => {
                    setPage((current) => Math.max(1, current - 1));
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  disabled={page >= totalPages}
                  onClick={() => {
                    setPage((current) => current + 1);
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

interface RequestsFiltersProps {
  searchInput: string;
  statusFilter: "" | WorkflowRequestStatus;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: "" | WorkflowRequestStatus) => void;
}

function RequestsFilters({
  searchInput,
  statusFilter,
  onSearchChange,
  onStatusChange,
}: RequestsFiltersProps) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor="request-search"
          >
            Search
          </label>
          <Input
            id="request-search"
            placeholder="Search by title or workflow…"
            value={searchInput}
            onChange={(event) => {
              onSearchChange(event.target.value);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor="request-status"
          >
            Status
          </label>
          <Select
            id="request-status"
            value={statusFilter}
            onChange={(event) => {
              onStatusChange(event.target.value as "" | WorkflowRequestStatus);
            }}
          >
            <option value="">All statuses</option>
            {WORKFLOW_REQUEST_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatWorkflowRequestStatus(status)}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}

function RequestRow({ request }: { request: WorkflowRequestListItem }) {
  return (
    <tr className="transition-colors hover:bg-muted/20">
      <td className="px-4 py-3">
        <Link
          className="font-medium text-foreground hover:underline"
          to={`/requests/${request.id}`}
        >
          {request.title ?? "Untitled request"}
        </Link>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {request.workflowTemplate.name}
      </td>
      <td className="px-4 py-3">
        <WorkflowRequestStatusBadge status={request.status} />
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {request.currentStep?.name ?? "—"}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {formatWorkflowRequestDate(request.updatedAt)}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end">
          <Button asChild size="sm" type="button" variant="outline">
            <Link to={`/requests/${request.id}`}>View</Link>
          </Button>
        </div>
      </td>
    </tr>
  );
}

function RequestsEmptyState({ hasActiveFilters }: { hasActiveFilters: boolean }) {
  return (
    <div className="rounded-lg border border-dashed bg-card px-6 py-16 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <span aria-hidden className="text-lg text-muted-foreground">
          ◇
        </span>
      </div>
      <h3 className="mt-4 text-lg font-medium">
        {hasActiveFilters ? "No requests match your filters" : "No requests yet"}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {hasActiveFilters
          ? "Try adjusting your search or status filter to find what you are looking for."
          : "You have not started any requests yet. Start one from an available workflow."}
      </p>
      {hasActiveFilters ? null : (
        <Button asChild className="mt-4" type="button">
          <Link to="/requests/start">Start a request</Link>
        </Button>
      )}
    </div>
  );
}

function RequestsFiltersSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="h-10 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    </div>
  );
}

function RequestsTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="space-y-0 divide-y p-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex gap-4 py-3">
            <div className="h-5 flex-1 animate-pulse rounded bg-muted" />
            <div className="h-5 w-24 animate-pulse rounded bg-muted" />
            <div className="h-5 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
