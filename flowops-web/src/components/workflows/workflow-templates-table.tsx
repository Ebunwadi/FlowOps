import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

import {
  activateWorkflowTemplate,
  archiveWorkflowTemplate,
  deactivateWorkflowTemplate,
  listWorkflowTemplates,
} from "@/api/workflow-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { ApiClientError } from "@/types/api";
import {
  formatWorkflowTemplateDate,
  formatWorkflowTemplateStatus,
  WORKFLOW_TEMPLATE_STATUSES,
  type WorkflowTemplateListItem,
  type WorkflowTemplateStatus,
} from "@/types/workflow-template";

import { WorkflowTemplateStatusBadge } from "./workflow-template-status-badge";

export interface WorkflowTemplatePermissions {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canActivate: boolean;
  canDeactivate: boolean;
  canArchive: boolean;
}

interface WorkflowTemplatesTableProps {
  permissions: WorkflowTemplatePermissions;
}

const PAGE_SIZE = 20;

export function WorkflowTemplatesTable({ permissions }: WorkflowTemplatesTableProps) {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | WorkflowTemplateStatus>("");
  const [categoryInput, setCategoryInput] = useState("");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(searchInput.trim());
  const debouncedCategory = useDebouncedValue(categoryInput.trim());

  const templatesQuery = useQuery({
    queryKey: [
      "workflow-templates",
      debouncedSearch,
      statusFilter,
      debouncedCategory,
      page,
    ],
    queryFn: () =>
      listWorkflowTemplates({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        category: debouncedCategory || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    enabled: permissions.canView,
  });

  const invalidateTemplates = async () => {
    await queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
  };

  const statusMutation = useMutation({
    mutationFn: async ({
      templateId,
      action,
    }: {
      templateId: string;
      action: "activate" | "deactivate" | "archive";
    }) => {
      if (action === "activate") {
        return activateWorkflowTemplate(templateId);
      }

      if (action === "deactivate") {
        return deactivateWorkflowTemplate(templateId);
      }

      return archiveWorkflowTemplate(templateId);
    },
    onSuccess: async () => {
      setActionError(null);
      await invalidateTemplates();
    },
    onError: (error) => {
      setActionError(getErrorMessage(error));
    },
    onSettled: () => {
      setPendingTemplateId(null);
    },
  });

  const handleStatusAction = (
    template: WorkflowTemplateListItem,
    action: "activate" | "deactivate" | "archive",
  ) => {
    const confirmMessages: Record<typeof action, string> = {
      activate: `Activate "${template.name}"? It will become available for new requests.`,
      deactivate: `Deactivate "${template.name}"? New requests will no longer use this template.`,
      archive: `Archive "${template.name}"? This template will be hidden from the default list.`,
    };

    if (!window.confirm(confirmMessages[action])) {
      return;
    }

    setPendingTemplateId(template.id);
    statusMutation.mutate({ templateId: template.id, action });
  };

  if (!permissions.canView) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Your role does not include access to workflow templates. Contact an
        organisation admin if you need access.
      </div>
    );
  }

  if (templatesQuery.isLoading) {
    return (
      <div className="space-y-4">
        <WorkflowTemplatesFiltersSkeleton />
        <WorkflowTemplatesTableSkeleton />
      </div>
    );
  }

  if (templatesQuery.isError) {
    return (
      <div className="space-y-4">
        <WorkflowTemplatesFilters
          categoryInput={categoryInput}
          searchInput={searchInput}
          statusFilter={statusFilter}
          onCategoryChange={(value) => {
            setCategoryInput(value);
            setPage(1);
          }}
          onSearchChange={(value) => {
            setSearchInput(value);
            setPage(1);
          }}
          onStatusChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        />
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center">
          <h3 className="text-sm font-medium text-red-900">
            Unable to load workflow templates
          </h3>
          <p className="mt-1 text-sm text-red-700">
            {getErrorMessage(templatesQuery.error)}
          </p>
          <Button
            className="mt-4"
            onClick={() => {
              void templatesQuery.refetch();
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const data = templatesQuery.data;

  if (!data) {
    return null;
  }

  const { items, total, totalPages } = data;
  const hasActiveFilters =
    debouncedSearch.length > 0 ||
    statusFilter.length > 0 ||
    debouncedCategory.length > 0;
  const showActionsColumn =
    permissions.canUpdate ||
    permissions.canActivate ||
    permissions.canDeactivate ||
    permissions.canArchive;

  return (
    <div className="space-y-4">
      <WorkflowTemplatesFilters
        categoryInput={categoryInput}
        searchInput={searchInput}
        statusFilter={statusFilter}
        onCategoryChange={(value) => {
          setCategoryInput(value);
          setPage(1);
        }}
        onSearchChange={(value) => {
          setSearchInput(value);
          setPage(1);
        }}
        onStatusChange={(value) => {
          setStatusFilter(value);
          setPage(1);
        }}
      />

      {actionError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      {items.length === 0 ? (
        <WorkflowTemplatesEmptyState hasActiveFilters={hasActiveFilters} />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Workflow name
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Fields
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Steps
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Last updated
                    </th>
                    {showActionsColumn ? (
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Actions
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((template) => (
                    <WorkflowTemplateRow
                      key={template.id}
                      isPending={pendingTemplateId === template.id}
                      permissions={permissions}
                      showActionsColumn={showActionsColumn}
                      template={template}
                      onStatusAction={handleStatusAction}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, total)} of {total} templates
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

interface WorkflowTemplatesFiltersProps {
  searchInput: string;
  statusFilter: "" | WorkflowTemplateStatus;
  categoryInput: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: "" | WorkflowTemplateStatus) => void;
  onCategoryChange: (value: string) => void;
}

function WorkflowTemplatesFilters({
  searchInput,
  statusFilter,
  categoryInput,
  onSearchChange,
  onStatusChange,
  onCategoryChange,
}: WorkflowTemplatesFiltersProps) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="workflow-search">
            Search
          </label>
          <Input
            id="workflow-search"
            placeholder="Search by name…"
            value={searchInput}
            onChange={(event) => {
              onSearchChange(event.target.value);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="workflow-status">
            Status
          </label>
          <Select
            id="workflow-status"
            value={statusFilter}
            onChange={(event) => {
              onStatusChange(event.target.value as "" | WorkflowTemplateStatus);
            }}
          >
            <option value="">All statuses</option>
            {WORKFLOW_TEMPLATE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatWorkflowTemplateStatus(status)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="workflow-category">
            Category
          </label>
          <Input
            id="workflow-category"
            placeholder="Filter by category…"
            value={categoryInput}
            onChange={(event) => {
              onCategoryChange(event.target.value);
            }}
          />
        </div>
      </div>
    </div>
  );
}

interface WorkflowTemplateRowProps {
  template: WorkflowTemplateListItem;
  permissions: WorkflowTemplatePermissions;
  showActionsColumn: boolean;
  isPending: boolean;
  onStatusAction: (
    template: WorkflowTemplateListItem,
    action: "activate" | "deactivate" | "archive",
  ) => void;
}

function WorkflowTemplateRow({
  template,
  permissions,
  showActionsColumn,
  isPending,
  onStatusAction,
}: WorkflowTemplateRowProps) {
  const canActivate =
    permissions.canActivate &&
    (template.status === "DRAFT" || template.status === "INACTIVE");
  const canDeactivate =
    permissions.canDeactivate && template.status === "ACTIVE";
  const canArchive =
    permissions.canArchive && template.status !== "ARCHIVED";

  return (
    <tr className="transition-colors hover:bg-muted/20">
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-foreground">{template.name}</p>
          {template.description ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {template.description}
            </p>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {template.category ?? "—"}
      </td>
      <td className="px-4 py-3">
        <WorkflowTemplateStatusBadge status={template.status} />
      </td>
      <td className="px-4 py-3 text-muted-foreground">{template.fieldsCount}</td>
      <td className="px-4 py-3 text-muted-foreground">{template.stepsCount}</td>
      <td className="px-4 py-3 text-muted-foreground">
        {formatWorkflowTemplateDate(template.updatedAt)}
      </td>
      {showActionsColumn ? (
        <td className="px-4 py-3">
          <div className="flex flex-wrap justify-end gap-1.5">
            {permissions.canView ? (
              <Button asChild size="sm" type="button" variant="outline">
                <Link to={`/workflows/${template.id}`}>View</Link>
              </Button>
            ) : null}
            {permissions.canUpdate ? (
              <Button asChild size="sm" type="button" variant="outline">
                <Link to={`/workflows/${template.id}/edit`}>Edit</Link>
              </Button>
            ) : null}
            {canActivate ? (
              <Button
                disabled={isPending}
                onClick={() => {
                  onStatusAction(template, "activate");
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                Activate
              </Button>
            ) : null}
            {canDeactivate ? (
              <Button
                disabled={isPending}
                onClick={() => {
                  onStatusAction(template, "deactivate");
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                Deactivate
              </Button>
            ) : null}
            {canArchive ? (
              <Button
                disabled={isPending}
                onClick={() => {
                  onStatusAction(template, "archive");
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                Archive
              </Button>
            ) : null}
          </div>
        </td>
      ) : null}
    </tr>
  );
}

function WorkflowTemplatesEmptyState({
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
        {hasActiveFilters ? "No templates match your filters" : "No workflow templates yet"}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {hasActiveFilters
          ? "Try adjusting your search or filter criteria to find what you are looking for."
          : "Create your first workflow template to standardise approvals and requests across your organisation."}
      </p>
    </div>
  );
}

function WorkflowTemplatesFiltersSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-10 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    </div>
  );
}

function WorkflowTemplatesTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="space-y-0 divide-y p-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex gap-4 py-3">
            <div className="h-5 flex-1 animate-pulse rounded bg-muted" />
            <div className="h-5 w-20 animate-pulse rounded bg-muted" />
            <div className="h-5 w-16 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}
