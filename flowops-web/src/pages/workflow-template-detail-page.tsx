import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";

import { getWorkflowTemplateById } from "@/api/workflow-templates";
import { useOrganisation } from "@/auth/use-organisation";
import { usePermissions } from "@/auth/use-permissions";
import { WorkflowTemplateStatusBadge } from "@/components/workflows/workflow-template-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiClientError } from "@/types/api";
import {
  formatWorkflowTemplateDate,
  type WorkflowTemplateField,
} from "@/types/workflow-template";
import { FIELD_TYPE_LABELS } from "@/schemas/workflow-template.schema";

export function WorkflowTemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { currentOrganisation } = useOrganisation();
  const { hasPermission } = usePermissions();

  const canView = hasPermission("workflows:view");
  const canUpdate = hasPermission("workflows:update");
  const wasJustCreated = Boolean(
    (location.state as { created?: boolean } | null)?.created,
  );

  const templateQuery = useQuery({
    queryKey: ["workflow-templates", id],
    queryFn: () => getWorkflowTemplateById(id!),
    enabled: Boolean(id) && canView,
  });

  if (!currentOrganisation) {
    return <Navigate replace to="/organisation/setup" />;
  }

  if (!canView) {
    return <Navigate replace to="/workflows" />;
  }

  if (!id) {
    return <Navigate replace to="/workflows" />;
  }

  if (templateQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (templateQuery.isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-[28px] font-semibold tracking-tight">Workflow template</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {templateQuery.error instanceof ApiClientError
            ? templateQuery.error.message
            : "Unable to load workflow template."}
        </div>
        <Button asChild type="button" variant="outline">
          <Link to="/workflows">Back to workflows</Link>
        </Button>
      </div>
    );
  }

  const template = templateQuery.data;

  if (!template) {
    return null;
  }

  return (
    <div className="space-y-6">
      {wasJustCreated ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Workflow template created successfully. It is saved as a draft until you activate
          it.
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link className="hover:text-foreground" to="/workflows">
              Workflows
            </Link>
            <span className="mx-2">/</span>
            <span>{template.name}</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-semibold tracking-tight">{template.name}</h1>
            <WorkflowTemplateStatusBadge status={template.status} />
          </div>
          {template.description ? (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {template.description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild type="button" variant="outline">
            <Link to="/workflows">Back to list</Link>
          </Button>
          {canUpdate ? (
            <Button asChild type="button">
              <Link to={`/workflows/${template.id}/edit`}>Edit template</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/80 shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
            <CardDescription>Template metadata and counts.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Category</dt>
                <dd className="font-medium">{template.category ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Form fields</dt>
                <dd className="font-medium">{template.fieldsCount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Approval steps</dt>
                <dd className="font-medium">{template.stepsCount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last updated</dt>
                <dd className="font-medium">
                  {formatWorkflowTemplateDate(template.updatedAt)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Form fields</CardTitle>
            <CardDescription>Fields requesters complete when submitting.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {template.fields.map((field) => (
                <FieldSummary key={field.id} field={field} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Approval steps</CardTitle>
          <CardDescription>Review sequence for submitted requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {template.steps.map((step, index) => (
              <li key={step.id} className="rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{step.name}</p>
                    {step.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm text-muted-foreground">
                      Approver role:{" "}
                      <span className="font-medium text-foreground">
                        {step.approverRole.name}
                      </span>
                    </p>
                    {step.slaHours ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        SLA: {step.slaHours} hours
                      </p>
                    ) : null}
                    {step.allowDelegation ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Delegation allowed
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

function FieldSummary({ field }: { field: WorkflowTemplateField }) {
  const options = Array.isArray(field.options)
    ? field.options.filter((option): option is string => typeof option === "string")
    : [];

  return (
    <div className="rounded-lg border px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">
          {field.label}
          {field.isRequired ? <span className="text-red-600"> *</span> : null}
        </p>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {FIELD_TYPE_LABELS[field.fieldType]}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Key: {field.fieldKey}</p>
      {options.length > 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Options: {options.join(", ")}
        </p>
      ) : null}
    </div>
  );
}
