import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { listPendingApprovals } from "@/api/approvals";
import { WorkflowRequestStatusBadge } from "@/components/requests/workflow-request-status-badge";
import { Button } from "@/components/ui/button";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { Input } from "@/components/ui/input";
import { formatApiErrorMessage } from "@/lib/api-errors";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { PendingApprovalListItem } from "@/types/approval";
import {
  formatRequesterName,
  formatWorkflowRequestDate,
  formatWorkflowRequestDateTime,
} from "@/types/workflow-request";

const PAGE_SIZE = 20;

export function PendingApprovalsTable() {
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(searchInput.trim());

  const pendingApprovalsQuery = useQuery({
    queryKey: ["pending-approvals", debouncedSearch, page],
    queryFn: () =>
      listPendingApprovals({
        search: debouncedSearch || undefined,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const summary = useMemo(() => {
    const items = pendingApprovalsQuery.data?.items ?? [];
    const now = Date.now();

    return {
      overdue: items.filter(
        (item) => item.dueAt !== null && Date.parse(item.dueAt) < now,
      ).length,
      dueSoon: items.filter((item) => {
        if (!item.dueAt) {
          return false;
        }

        const dueTime = Date.parse(item.dueAt);
        const weekFromNow = now + 7 * 24 * 60 * 60 * 1000;
        return dueTime >= now && dueTime <= weekFromNow;
      }).length,
    };
  }, [pendingApprovalsQuery.data?.items]);

  if (pendingApprovalsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <SummaryCardsSkeleton />
        <PendingApprovalsFiltersSkeleton />
        <PendingApprovalsTableSkeleton />
      </div>
    );
  }

  if (pendingApprovalsQuery.isError) {
    return (
      <div className="space-y-4">
        <PendingApprovalsFilters
          searchInput={searchInput}
          onSearchChange={(value) => {
            setSearchInput(value);
            setPage(1);
          }}
        />
        <DismissibleAlert
          className="text-center"
          messageKey={formatApiErrorMessage(pendingApprovalsQuery.error)}
          variant="error"
        >
          <h3 className="text-sm font-medium text-red-900">
            Unable to load pending approvals
          </h3>
          <p className="mt-1 text-sm text-red-700">
            {formatApiErrorMessage(pendingApprovalsQuery.error)}
          </p>
          <Button
            className="mt-4"
            onClick={() => {
              void pendingApprovalsQuery.refetch();
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

  const data = pendingApprovalsQuery.data;

  if (!data) {
    return null;
  }

  const { items, total, totalPages } = data;
  const hasActiveFilters = debouncedSearch.length > 0;

  return (
    <div className="space-y-4">
      <PendingApprovalsSummaryCards
        dueSoon={summary.dueSoon}
        overdue={summary.overdue}
        total={total}
      />

      <PendingApprovalsFilters
        searchInput={searchInput}
        onSearchChange={(value) => {
          setSearchInput(value);
          setPage(1);
        }}
      />

      {items.length === 0 ? (
        <PendingApprovalsEmptyState hasActiveFilters={hasActiveFilters} />
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
                      Requester
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Current step
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Submitted
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Due
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((approval) => (
                    <PendingApprovalRow key={approval.id} approval={approval} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, total)} of {total} pending approvals
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

interface PendingApprovalsSummaryCardsProps {
  total: number;
  overdue: number;
  dueSoon: number;
}

function PendingApprovalsSummaryCards({
  total,
  overdue,
  dueSoon,
}: PendingApprovalsSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <SummaryCard label="Pending approvals" value={String(total)} />
      <SummaryCard label="Due within 7 days" value={String(dueSoon)} />
      <SummaryCard
        label="Overdue on this page"
        tone={overdue > 0 ? "warning" : "default"}
        value={String(overdue)}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning";
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

interface PendingApprovalsFiltersProps {
  searchInput: string;
  onSearchChange: (value: string) => void;
}

function PendingApprovalsFilters({
  searchInput,
  onSearchChange,
}: PendingApprovalsFiltersProps) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="space-y-1.5">
        <label
          className="text-xs font-medium text-muted-foreground"
          htmlFor="pending-approval-search"
        >
          Search
        </label>
        <Input
          id="pending-approval-search"
          placeholder="Search by title or workflow…"
          value={searchInput}
          onChange={(event) => {
            onSearchChange(event.target.value);
          }}
        />
      </div>
    </div>
  );
}

function PendingApprovalRow({ approval }: { approval: PendingApprovalListItem }) {
  const isOverdue =
    approval.dueAt !== null && Date.parse(approval.dueAt) < Date.now();

  return (
    <tr className="transition-colors hover:bg-muted/20">
      <td className="px-4 py-3">
        <Link
          className="font-medium text-foreground hover:underline"
          to={`/approvals/${approval.id}`}
        >
          {approval.title ?? "Untitled request"}
        </Link>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {approval.workflowTemplate.name}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {formatRequesterName(approval.requester)}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{approval.currentStep.name}</td>
      <td className="px-4 py-3 text-muted-foreground">
        {approval.submittedAt
          ? formatWorkflowRequestDate(approval.submittedAt)
          : "—"}
      </td>
      <td className="px-4 py-3">
        {approval.dueAt ? (
          <span className={isOverdue ? "font-medium text-amber-700" : "text-muted-foreground"}>
            {formatWorkflowRequestDateTime(approval.dueAt)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <WorkflowRequestStatusBadge status={approval.status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end">
          <Button asChild size="sm" type="button">
            <Link to={`/approvals/${approval.id}`}>Review</Link>
          </Button>
        </div>
      </td>
    </tr>
  );
}

function PendingApprovalsEmptyState({
  hasActiveFilters,
}: {
  hasActiveFilters: boolean;
}) {
  return (
    <div className="rounded-lg border border-dashed bg-card px-6 py-16 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <span aria-hidden className="text-lg text-muted-foreground">
          ✓
        </span>
      </div>
      <h3 className="mt-4 text-lg font-medium">
        {hasActiveFilters
          ? "No pending approvals match your search"
          : "No pending approvals"}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {hasActiveFilters
          ? "Try a different search term to find requests waiting for your review."
          : "You are all caught up. New requests assigned to your role will appear here."}
      </p>
    </div>
  );
}

function SummaryCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-lg border bg-muted/40" />
      ))}
    </div>
  );
}

function PendingApprovalsFiltersSkeleton() {
  return <div className="h-[74px] animate-pulse rounded-lg border bg-muted/40" />;
}

function PendingApprovalsTableSkeleton() {
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
