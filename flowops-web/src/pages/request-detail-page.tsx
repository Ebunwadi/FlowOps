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
import { RequestApprovalHistory } from "@/components/requests/request-approval-history";
import { RequestComments } from "@/components/requests/request-comments";
import { RequestTimeline } from "@/components/requests/request-timeline";
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
  isEditableRequestStatus,
  type WorkflowRequestDetailResponse,
  type WorkflowRequestValueDetail,
} from "@/types/workflow-request";

function canCommentOnRequest(
  request: WorkflowRequestDetailResponse,
  userId: string | undefined,
  roleId: string | undefined,
  hasViewAll: boolean,
): boolean {
  if (!userId) {
    return false;
  }

  if (request.requester.id === userId) {
    return true;
  }

  if (hasViewAll) {
    return true;
  }

  const currentStep = request.approvalSteps.find((step) => step.isCurrent);
  return Boolean(currentStep && roleId && currentStep.approverRole.id === roleId);
}

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentOrganisation, membershipAccess } = useOrganisation();
  const { profile } = useAuth();
  const { hasPermission } = usePermissions();

  const [cancelError, setCancelError] = useState<string | null>(null);

  const pageState = location.state as
    | { submitted?: boolean; draftSaved?: boolean; resubmitted?: boolean; changesSaved?: boolean }
    | null;
  const wasJustSubmitted = Boolean(pageState?.submitted);
  const draftWasSaved = Boolean(pageState?.draftSaved);
  const wasJustResubmitted = Boolean(pageState?.resubmitted);
  const changesWereSaved = Boolean(pageState?.changesSaved);

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
  const canEditRequest =
    isOwner &&
    isEditableRequestStatus(request.status) &&
    hasPermission("requests:create");
  const editButtonLabel =
    request.status === "CHANGES_REQUESTED" ? "Update request" : "Edit draft";
  const canCancel =
    isOwner &&
    hasPermission("requests:cancel") &&
    isCancellableStatus(request.status);
  const canComment = canCommentOnRequest(
    request,
    profile?.id,
    membershipAccess?.role.id,
    hasPermission("requests:view-all"),
  );
  const showReviewLink =
    hasPermission("approvals:view") && request.status === "PENDING_APPROVAL";

  const handleCancel = () => {
    if (!window.confirm("Cancel this request? This action cannot be undone.")) {
      return;
    }
    cancelMutation.mutate();
  };

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

      {changesWereSaved ? (
        <DismissibleAlert onDismiss={clearPageState}>
          Changes saved. Resubmit the request when you are ready for the approver
          to review it again.
        </DismissibleAlert>
      ) : null}

      {wasJustResubmitted ? (
        <DismissibleAlert onDismiss={clearPageState}>
          Request resubmitted successfully. It is back in the approval queue for
          the current step.
        </DismissibleAlert>
      ) : null}

      {request.status === "CHANGES_REQUESTED" && isOwner && !wasJustResubmitted ? (
        <DismissibleAlert variant="warning">
          An approver requested changes on this request. Update the details and
          resubmit when you are ready.
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
          {canEditRequest ? (
            <Button asChild type="button">
              <Link to={`/requests/${request.id}/edit`}>{editButtonLabel}</Link>
            </Button>
          ) : null}
          {showReviewLink ? (
            <Button asChild type="button">
              <Link to={`/approvals/${request.id}`}>Review</Link>
            </Button>
          ) : null}
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
            {request.values.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No field values were provided for this request.
              </p>
            ) : (
              <dl className="space-y-4">
                {request.values.map((value) => (
                  <RequestValueRow key={value.workflowFieldId} value={value} />
                ))}
              </dl>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Approval timeline</CardTitle>
          <CardDescription>
            Where this request is in the approval process.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RequestTimeline items={request.timeline} />
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Approval history</CardTitle>
          <CardDescription>
            Recorded decisions from approvers on each step.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RequestApprovalHistory items={request.approvalHistory} />
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Comments</CardTitle>
          <CardDescription>
            Notes and discussion about this request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RequestComments
            canComment={canComment}
            initialComments={request.comments}
            workflowRequestId={request.id}
          />
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

function RequestDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-72 animate-pulse rounded-lg bg-muted lg:col-span-1" />
        <div className="h-72 animate-pulse rounded-lg bg-muted lg:col-span-2" />
      </div>
      <div className="h-48 animate-pulse rounded-lg bg-muted" />
      <div className="h-48 animate-pulse rounded-lg bg-muted" />
      <div className="h-40 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
