import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";

import {
  cancelWorkflowRequest,
  getWorkflowRequestById,
} from "@/api/workflow-requests";
import { useAuth } from "@/auth/use-auth";
import { useOrganisation } from "@/auth/use-organisation";
import { usePermissions } from "@/auth/use-permissions";
import { WorkflowRequestStatusBadge } from "@/components/requests/workflow-request-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { formatApiErrorMessage } from "@/lib/api-errors";
import {
  formatRequesterName,
  formatWorkflowRequestDateTime,
  formatWorkflowRequestValue,
  isCancellableStatus,
  type WorkflowRequestApprovalStepDetail,
  type WorkflowRequestDetailResponse,
  type WorkflowRequestValueDetail,
} from "@/types/workflow-request";

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentOrganisation } = useOrganisation();
  const { profile } = useAuth();
  const { hasPermission } = usePermissions();

  const [cancelError, setCancelError] = useState<string | null>(null);

  const pageState = location.state as
    | { submitted?: boolean; draftSaved?: boolean }
    | null;
  const wasJustSubmitted = Boolean(pageState?.submitted);
  const draftWasSaved = Boolean(pageState?.draftSaved);

  const clearPageState = () => {
    navigate(location.pathname, { replace: true, state: null });
  };

  const requestQuery = useQuery({
    queryKey: ["workflow-request", id],
    queryFn: () => getWorkflowRequestById(id!),
    enabled: Boolean(id),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelWorkflowRequest(id!),
    onSuccess: async () => {
      setCancelError(null);
      await queryClient.invalidateQueries({ queryKey: ["workflow-request", id] });
      await queryClient.invalidateQueries({ queryKey: ["my-workflow-requests"] });
    },
    onError: (error) => {
      setCancelError(formatApiErrorMessage(error));
    },
  });

  if (!currentOrganisation) {
    return <Navigate replace to="/organisation/setup" />;
  }

  if (!id) {
    return <Navigate replace to="/requests" />;
  }

  if (requestQuery.isLoading) {
    return <RequestDetailSkeleton />;
  }

  if (requestQuery.isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-[28px] font-semibold tracking-tight">Request</h1>
        <DismissibleAlert
          messageKey={formatApiErrorMessage(requestQuery.error)}
          variant="error"
        >
          {formatApiErrorMessage(requestQuery.error)}
        </DismissibleAlert>
        <Button asChild type="button" variant="outline">
          <Link to="/requests">Back to requests</Link>
        </Button>
      </div>
    );
  }

  const request = requestQuery.data;

  if (!request) {
    return null;
  }

  const isOwner = profile?.id === request.requester.id;
  const canCancel =
    isOwner &&
    hasPermission("requests:cancel") &&
    isCancellableStatus(request.status);

  const handleCancel = () => {
    if (!window.confirm("Cancel this request? This action cannot be undone.")) {
      return;
    }
    cancelMutation.mutate();
  };

  const orderedValues = request.values;
  const orderedSteps = [...request.approvalSteps].sort(
    (a, b) => a.stepOrder - b.stepOrder,
  );

  return (
    <div className="space-y-6">
      {wasJustSubmitted ? (
        <DismissibleAlert onDismiss={clearPageState}>
          Request submitted successfully. It is now moving through the approval
          process.
        </DismissibleAlert>
      ) : null}

      {draftWasSaved ? (
        <DismissibleAlert onDismiss={clearPageState}>
          Draft saved successfully. You can submit it for approval when you are
          ready.
        </DismissibleAlert>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link className="hover:text-foreground" to="/requests">
              Requests
            </Link>
            <span className="mx-2">/</span>
            <span>{request.title ?? "Untitled request"}</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-semibold tracking-tight">
              {request.title ?? "Untitled request"}
            </h1>
            <WorkflowRequestStatusBadge status={request.status} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {request.workflowTemplate.name}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button asChild type="button" variant="outline">
            <Link to="/requests">Back to list</Link>
          </Button>
          {canCancel ? (
            <Button
              disabled={cancelMutation.isPending}
              onClick={handleCancel}
              type="button"
              variant="outline"
            >
              {cancelMutation.isPending ? "Cancelling…" : "Cancel request"}
            </Button>
          ) : null}
        </div>
      </div>

      {cancelError ? (
        <DismissibleAlert
          messageKey={cancelError}
          onDismiss={() => {
            setCancelError(null);
          }}
          variant="error"
        >
          {cancelError}
        </DismissibleAlert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <RequestSummaryCard request={request} />

        <Card className="border-border/80 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Submitted details</CardTitle>
            <CardDescription>
              The information provided when this request was created.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orderedValues.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No field values were provided for this request.
              </p>
            ) : (
              <dl className="space-y-4">
                {orderedValues.map((value) => (
                  <RequestValueRow key={value.workflowFieldId} value={value} />
                ))}
              </dl>
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
            <p className="text-sm text-muted-foreground">
              No approval steps defined for this workflow.
            </p>
          ) : (
            <ol className="space-y-3">
              {orderedSteps.map((step, index) => (
                <ApprovalStepRow key={step.id} index={index} step={step} />
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RequestSummaryCard({
  request,
}: {
  request: WorkflowRequestDetailResponse;
}) {
  return (
    <Card className="border-border/80 shadow-sm lg:col-span-1">
      <CardHeader>
        <CardTitle className="text-lg">Summary</CardTitle>
        <CardDescription>Request metadata and progress.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="mt-1">
              <WorkflowRequestStatusBadge status={request.status} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Workflow</dt>
            <dd className="font-medium">{request.workflowTemplate.name}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Category</dt>
            <dd className="font-medium">
              {request.workflowTemplate.category ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Requested by</dt>
            <dd className="font-medium">{formatRequesterName(request.requester)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Current step</dt>
            <dd className="font-medium">{request.currentStep?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Submitted</dt>
            <dd className="font-medium">
              {request.submittedAt
                ? formatWorkflowRequestDateTime(request.submittedAt)
                : "—"}
            </dd>
          </div>
          {request.completedAt ? (
            <div>
              <dt className="text-muted-foreground">Completed</dt>
              <dd className="font-medium">
                {formatWorkflowRequestDateTime(request.completedAt)}
              </dd>
            </div>
          ) : null}
          {request.cancelledAt ? (
            <div>
              <dt className="text-muted-foreground">Cancelled</dt>
              <dd className="font-medium">
                {formatWorkflowRequestDateTime(request.cancelledAt)}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted-foreground">Created</dt>
            <dd className="font-medium">
              {formatWorkflowRequestDateTime(request.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Last updated</dt>
            <dd className="font-medium">
              {formatWorkflowRequestDateTime(request.updatedAt)}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function RequestValueRow({ value }: { value: WorkflowRequestValueDetail }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{value.label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm font-medium text-foreground">
        {formatWorkflowRequestValue(value.fieldType, value.value)}
      </dd>
    </div>
  );
}

function ApprovalStepRow({
  step,
  index,
}: {
  step: WorkflowRequestApprovalStepDetail;
  index: number;
}) {
  return (
    <li
      className={
        step.isCurrent
          ? "rounded-lg border border-primary/40 bg-primary/5 p-4"
          : "rounded-lg border p-4"
      }
    >
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
          {step.stepOrder}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">
              Step {index + 1}: {step.name}
            </p>
            {step.isCurrent ? (
              <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Current
              </span>
            ) : null}
          </div>
          {step.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
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
        </div>
      </div>
    </li>
  );
}

function RequestDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-72 animate-pulse rounded-lg bg-muted lg:col-span-1" />
        <div className="h-72 animate-pulse rounded-lg bg-muted lg:col-span-2" />
      </div>
      <div className="h-48 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
