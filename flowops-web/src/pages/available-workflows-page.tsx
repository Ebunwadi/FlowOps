import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { listWorkflowTemplates } from "@/api/workflow-templates";
import { usePermissions } from "@/auth/use-permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatApiErrorMessage } from "@/lib/api-errors";
import type { WorkflowTemplateListItem } from "@/types/workflow-template";

const ACTIVE_TEMPLATES_LIMIT = 100;

export function AvailableWorkflowsPage() {
  const { hasPermission, membershipAccessLoading } = usePermissions();
  const canStart = hasPermission("requests:create");
  const canViewWorkflows = hasPermission("workflows:view");

  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const workflowsQuery = useQuery({
    queryKey: ["available-workflows"],
    queryFn: () =>
      listWorkflowTemplates({ status: "ACTIVE", limit: ACTIVE_TEMPLATES_LIMIT }),
    enabled: canStart && canViewWorkflows,
  });

  const items = workflowsQuery.data?.items ?? [];

  const categories = useMemo(() => {
    const unique = new Set<string>();
    for (const item of items) {
      if (item.category) {
        unique.add(item.category);
      }
    }
    return [...unique].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const normalisedSearch = searchInput.trim().toLowerCase();
  const filtered = items.filter((template) => {
    const matchesCategory =
      categoryFilter === "" || template.category === categoryFilter;
    const matchesSearch =
      normalisedSearch === "" ||
      template.name.toLowerCase().includes(normalisedSearch) ||
      (template.description?.toLowerCase().includes(normalisedSearch) ?? false);
    return matchesCategory && matchesSearch;
  });

  const hasActiveFilters = normalisedSearch !== "" || categoryFilter !== "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-foreground">
          Start a request
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a workflow to begin a new request. Only active workflows are
          available.
        </p>
      </div>

      {membershipAccessLoading ? (
        <p className="text-sm text-muted-foreground">Loading permissions…</p>
      ) : !canStart ? (
        <DismissibleAlert variant="warning">
          Your role does not include permission to submit workflow requests.
          Contact an organisation admin if you need access.
        </DismissibleAlert>
      ) : (
        <>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="workflow-search"
                >
                  Search
                </label>
                <Input
                  id="workflow-search"
                  placeholder="Search workflows…"
                  value={searchInput}
                  onChange={(event) => {
                    setSearchInput(event.target.value);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="workflow-category"
                >
                  Category
                </label>
                <Select
                  id="workflow-category"
                  value={categoryFilter}
                  onChange={(event) => {
                    setCategoryFilter(event.target.value);
                  }}
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {workflowsQuery.isLoading ? (
            <AvailableWorkflowsSkeleton />
          ) : workflowsQuery.isError ? (
            <DismissibleAlert
              className="text-center"
              messageKey={formatApiErrorMessage(workflowsQuery.error)}
              variant="error"
            >
              <h3 className="text-sm font-medium text-red-900">
                Unable to load workflows
              </h3>
              <p className="mt-1 text-sm text-red-700">
                {formatApiErrorMessage(workflowsQuery.error)}
              </p>
              <Button
                className="mt-4"
                onClick={() => {
                  void workflowsQuery.refetch();
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                Try again
              </Button>
            </DismissibleAlert>
          ) : filtered.length === 0 ? (
            <AvailableWorkflowsEmptyState hasActiveFilters={hasActiveFilters} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((template) => (
                <WorkflowCard key={template.id} template={template} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function WorkflowCard({ template }: { template: WorkflowTemplateListItem }) {
  return (
    <Card className="flex h-full flex-col border-border/80">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-semibold text-foreground">
              {template.name}
            </h3>
            {template.category ? (
              <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {template.category}
              </span>
            ) : null}
          </div>
          <p className="line-clamp-3 min-h-[3rem] text-sm text-muted-foreground">
            {template.description ?? "No description provided."}
          </p>
        </div>

        <div className="mt-auto space-y-3">
          <p className="text-xs text-muted-foreground">
            {template.stepsCount}{" "}
            {template.stepsCount === 1 ? "approval step" : "approval steps"}
          </p>
          <Button asChild className="w-full" type="button">
            <Link to={`/requests/start/${template.id}`}>Start request</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AvailableWorkflowsEmptyState({
  hasActiveFilters,
}: {
  hasActiveFilters: boolean;
}) {
  return (
    <div className="rounded-lg border border-dashed bg-card px-6 py-16 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <span aria-hidden className="text-lg text-muted-foreground">
          ◇
        </span>
      </div>
      <h3 className="mt-4 text-lg font-medium">
        {hasActiveFilters
          ? "No workflows match your filters"
          : "No active workflows available"}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {hasActiveFilters
          ? "Try adjusting your search or category filter to find what you are looking for."
          : "There are no active workflows to start a request from yet. Check back once an admin has published one."}
      </p>
    </div>
  );
}

function AvailableWorkflowsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-44 animate-pulse rounded-lg border bg-card shadow-sm"
        />
      ))}
    </div>
  );
}
