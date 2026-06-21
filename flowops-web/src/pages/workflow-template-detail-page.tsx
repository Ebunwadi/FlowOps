import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";

import { getWorkflowTemplateById } from "@/api/workflow-templates";
import { useOrganisation } from "@/auth/use-organisation";
import { usePermissions } from "@/auth/use-permissions";
import { WorkflowTemplateActions } from "@/components/workflows/workflow-template-actions";
import { WorkflowTemplateStatusBadge } from "@/components/workflows/workflow-template-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { FIELD_TYPE_LABELS } from "@/schemas/workflow-template.schema";
import { ApiClientError } from "@/types/api";
import {
  formatWorkflowTemplateDate,
  type WorkflowTemplateField,
  type WorkflowTemplateStep,
} from "@/types/workflow-template";

export function WorkflowTemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentOrganisation } = useOrganisation();
  const { hasPermission } = usePermissions();

  const canView = hasPermission("workflows:view");
  const canUpdate = hasPermission("workflows:update");
  const canActivate = hasPermission("workflows:activate");
  const canDeactivate = hasPermission("workflows:deactivate");
  const canArchive = hasPermission("workflows:delete");

  const pageState = location.state as { created?: boolean; updated?: boolean } | null;
  const wasJustCreated = Boolean(pageState?.created);
  const wasJustUpdated = Boolean(pageState?.updated);

  const clearPageState = () => {
    navigate(location.pathname, { replace: true, state: null });
  };

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
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-48 animate-pulse rounded-lg bg-muted lg:col-span-1" />
          <div className="h-48 animate-pulse rounded-lg bg-muted lg:col-span-2" />
        </div>
        <div className="h-56 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (templateQuery.isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-[28px] font-semibold tracking-tight">Workflow template</h1>
        <DismissibleAlert
          messageKey={
            templateQuery.error instanceof ApiClientError
              ? templateQuery.error.message
              : "load-error"
          }
          variant="error"
        >
          {templateQuery.error instanceof ApiClientError
            ? templateQuery.error.message
            : "Unable to load workflow template."}
        </DismissibleAlert>
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

  const orderedFields = [...template.fields].sort((a, b) => a.fieldOrder - b.fieldOrder);
  const orderedSteps = [...template.steps].sort((a, b) => a.stepOrder - b.stepOrder);

  return (
    <div className="space-y-6">
      {wasJustCreated ? (
        <DismissibleAlert onDismiss={clearPageState}>
          Workflow template created successfully. It is saved as a draft until you activate
          it.
        </DismissibleAlert>
      ) : null}

      {wasJustUpdated ? (
        <DismissibleAlert onDismiss={clearPageState}>
          Workflow template updated successfully.
        </DismissibleAlert>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No description provided for this workflow template.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
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
          <WorkflowTemplateActions
            canActivate={canActivate}
            canArchive={canArchive}
            canDeactivate={canDeactivate}
            status={template.status}
            templateId={template.id}
            templateName={template.name}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/80 shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Workflow summary</CardTitle>
            <CardDescription>Template metadata and status.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="mt-1">
                  <WorkflowTemplateStatusBadge status={template.status} />
                </dd>
              </div>
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
                <dt className="text-muted-foreground">Availability</dt>
                <dd className="font-medium">
                  {template.isActive ? "Active for requests" : "Not active"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd className="font-medium">
                  {formatWorkflowTemplateDate(template.createdAt)}
                </dd>
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
            <CardDescription>
              Fields are shown in the order requesters will complete them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orderedFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">No form fields defined.</p>
            ) : (
              <ol className="space-y-3">
                {orderedFields.map((field) => (
                  <FieldSummary key={field.id} field={field} />
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Approval steps</CardTitle>
          <CardDescription>
            Steps are executed in order from first to last approver.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orderedSteps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approval steps defined.</p>
          ) : (
            <ol className="space-y-3">
              {orderedSteps.map((step, index) => (
                <StepSummary key={step.id} index={index} step={step} />
              ))}
            </ol>
          )}
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
    <li className="rounded-lg border px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">
            {field.fieldOrder}. {field.label}
            {field.isRequired ? <span className="text-red-600"> *</span> : null}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Key: {field.fieldKey}</p>
        </div>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {FIELD_TYPE_LABELS[field.fieldType]}
        </span>
      </div>
      {field.placeholder ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Placeholder: {field.placeholder}
        </p>
      ) : null}
      {field.helpText ? (
        <p className="mt-1 text-sm text-muted-foreground">Help: {field.helpText}</p>
      ) : null}
      {options.length > 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Options: {options.join(", ")}
        </p>
      ) : null}
    </li>
  );
}

function StepSummary({ step, index }: { step: WorkflowTemplateStep; index: number }) {
  return (
    <li className="rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
          {step.stepOrder}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            Step {index + 1}: {step.name}
          </p>
          {step.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
          ) : null}
          <p className="mt-2 text-sm text-muted-foreground">
            Approver role:{" "}
            <span className="font-medium text-foreground">{step.approverRole.name}</span>
          </p>
          {step.slaHours ? (
            <p className="mt-1 text-sm text-muted-foreground">
              SLA: {step.slaHours} hours
            </p>
          ) : null}
          <p className="mt-1 text-sm text-muted-foreground">
            Delegation: {step.allowDelegation ? "Allowed" : "Not allowed"}
          </p>
        </div>
      </div>
    </li>
  );
}
