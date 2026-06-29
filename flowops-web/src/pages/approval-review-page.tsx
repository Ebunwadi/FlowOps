import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";

import {
  approveWorkflowRequest,
  rejectWorkflowRequest,
  requestChangesWorkflowRequest,
} from "@/api/approvals";
import { getWorkflowRequestById } from "@/api/workflow-requests";
import { useOrganisation } from "@/auth/use-organisation";
import { usePermissions } from "@/auth/use-permissions";
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
import { Textarea } from "@/components/ui/textarea";
import { formatApiErrorMessage } from "@/lib/api-errors";
import { cn } from "@/lib/utils";
import {
  formatRequesterName,
  formatWorkflowRequestDateTime,
  formatWorkflowRequestValue,
  type WorkflowRequestDetailResponse,
} from "@/types/workflow-request";

type DecisionType = "approve" | "reject" | "request-changes";

export function ApprovalReviewPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const queryClient = useQueryClient();
  const { currentOrganisation } = useOrganisation();
  const { hasPermission } = usePermissions();

  const requestQuery = useQuery({
    queryKey: ["workflow-request", requestId],
    queryFn: () => getWorkflowRequestById(requestId!),
    enabled: Boolean(requestId),
  });

  if (!currentOrganisation) {
    return <Navigate replace to="/organisation/setup" />;
  }

  if (!requestId) {
    return <Navigate replace to="/approvals" />;
  }

  if (requestQuery.isLoading) {
    return <ApprovalReviewSkeleton />;
  }

  if (requestQuery.isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-[28px] font-semibold tracking-tight">Approval review</h1>
        <DismissibleAlert
          messageKey={formatApiErrorMessage(requestQuery.error)}
          variant="error"
        >
          {formatApiErrorMessage(requestQuery.error)}
        </DismissibleAlert>
        <Button asChild type="button" variant="outline">
          <Link to="/approvals">Back to approvals</Link>
        </Button>
      </div>
    );
  }

  const request = requestQuery.data;

  if (!request) {
    return null;
  }

  const isPending = request.status === "PENDING_APPROVAL";
  const canApprove = hasPermission("approvals:approve");
  const canReject = hasPermission("approvals:reject");
  const canDecide = isPending && (canApprove || canReject);

  const invalidateRequest = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["workflow-request", requestId],
    });
    await queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link className="hover:text-foreground" to="/approvals">
              Approvals
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
            <Link to="/approvals">Back to approvals</Link>
          </Button>
          <Button asChild type="button" variant="outline">
            <Link to={`/requests/${request.id}`}>View full request</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-border/80 shadow-sm">
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
                    <div key={value.workflowFieldId}>
                      <dt className="text-sm text-muted-foreground">{value.label}</dt>
                      <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm font-medium text-foreground">
                        {formatWorkflowRequestValue(value.fieldType, value.value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Attachments</CardTitle>
              <CardDescription>Files attached to this request.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Attachments are not available yet.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Approval timeline</CardTitle>
              <CardDescription>
                Progress of this request through its approval steps.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RequestTimeline items={request.timeline} />
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Comments</CardTitle>
              <CardDescription>
                Discuss this request with the requester and other approvers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RequestComments
                canComment
                initialComments={request.comments}
                workflowRequestId={request.id}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-1">
          <ReviewSummaryCard request={request} />

          {canDecide ? (
            <DecisionPanel
              canApprove={canApprove}
              canReject={canReject}
              onDecided={invalidateRequest}
              requestId={request.id}
            />
          ) : (
            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Decision</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {isPending
                    ? "Your role cannot act on this request."
                    : "This request is no longer awaiting a decision."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewSummaryCard({
  request,
}: {
  request: WorkflowRequestDetailResponse;
}) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Summary</CardTitle>
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
        </dl>
      </CardContent>
    </Card>
  );
}

function DecisionPanel({
  requestId,
  canApprove,
  canReject,
  onDecided,
}: {
  requestId: string;
  canApprove: boolean;
  canReject: boolean;
  onDecided: () => Promise<void>;
}) {
  const [selectedDecision, setSelectedDecision] = useState<DecisionType | null>(null);
  const [pendingDecision, setPendingDecision] = useState<DecisionType | null>(null);
  const [comment, setComment] = useState("");
  const [validationError, setValidationError] = useState<{
    type: DecisionType;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (type: DecisionType) => {
      const trimmed = comment.trim();
      if (type === "approve") {
        return approveWorkflowRequest(
          requestId,
          trimmed ? { comment: trimmed } : {},
        );
      }
      if (type === "reject") {
        return rejectWorkflowRequest(requestId, { comment: trimmed });
      }
      return requestChangesWorkflowRequest(requestId, { comment: trimmed });
    },
    onSuccess: async (_data, type) => {
      setError(null);
      setValidationError(null);
      setComment("");
      setSelectedDecision(null);
      setPendingDecision(null);
      setSuccess(
        type === "approve"
          ? "Request approved."
          : type === "reject"
            ? "Request rejected."
            : "Changes requested.",
      );
      await onDecided();
    },
    onError: (mutationError) => {
      setError(formatApiErrorMessage(mutationError));
    },
  });

  const requireCommentMessage = (type: DecisionType) =>
    type === "reject"
      ? "Add a comment explaining why you are rejecting this request."
      : "Add a comment describing the changes you need before this request can proceed.";

  const handleDecisionClick = (type: DecisionType) => {
    setSelectedDecision(type);
    setSuccess(null);
    setError(null);
    setValidationError(null);

    if (type === "approve") {
      const confirmed = window.confirm(
        "Are you sure you want to approve this request?",
      );
      if (!confirmed) {
        setSelectedDecision(null);
        return;
      }

      setPendingDecision(type);
      mutation.mutate(type);
      return;
    }

    if (comment.trim().length === 0) {
      setValidationError({
        type,
        message: requireCommentMessage(type),
      });
      return;
    }

    setPendingDecision(type);
    mutation.mutate(type);
  };

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Decision</CardTitle>
        <CardDescription>
          Approve, reject, or request changes on the current step.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {success ? (
          <DismissibleAlert messageKey={`success-${success}`}>{success}</DismissibleAlert>
        ) : null}
        {validationError ? (
          <DismissibleAlert
            messageKey={`validation-${validationError.type}`}
            variant="error"
          >
            {validationError.message}
          </DismissibleAlert>
        ) : null}
        {error ? (
          <DismissibleAlert messageKey={error} variant="error">
            {error}
          </DismissibleAlert>
        ) : null}

        <div className="space-y-1.5">
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor="decision-comment"
          >
            Comment{" "}
            <span className="text-muted-foreground/70">
              (required to reject or request changes)
            </span>
          </label>
          <Textarea
            id="decision-comment"
            maxLength={2000}
            placeholder="Add a comment for the requester…"
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);
              if (validationError && event.target.value.trim().length > 0) {
                setValidationError(null);
              }
            }}
          />
        </div>

        <div className="flex flex-col gap-2">
          {canApprove ? (
            <Button
              className={cn(
                "border border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100 hover:text-sky-950",
                selectedDecision === "approve" &&
                  "ring-2 ring-sky-500 ring-offset-1",
              )}
              disabled={mutation.isPending}
              onClick={() => {
                handleDecisionClick("approve");
              }}
              type="button"
              variant="outline"
            >
              {mutation.isPending && pendingDecision === "approve"
                ? "Approving…"
                : "Approve"}
            </Button>
          ) : null}
          {canReject ? (
            <>
              <Button
                className={cn(
                  selectedDecision === "request-changes" &&
                    "border-amber-300 bg-amber-50 text-amber-950 ring-2 ring-amber-500 ring-offset-1 hover:bg-amber-100",
                )}
                disabled={mutation.isPending}
                onClick={() => {
                  handleDecisionClick("request-changes");
                }}
                type="button"
                variant="outline"
              >
                {mutation.isPending && pendingDecision === "request-changes"
                  ? "Requesting…"
                  : "Request changes"}
              </Button>
              <Button
                className={cn(
                  selectedDecision === "reject" &&
                    "border-red-300 bg-red-50 text-red-950 ring-2 ring-red-500 ring-offset-1 hover:bg-red-100",
                )}
                disabled={mutation.isPending}
                onClick={() => {
                  handleDecisionClick("reject");
                }}
                type="button"
                variant="outline"
              >
                {mutation.isPending && pendingDecision === "reject"
                  ? "Rejecting…"
                  : "Reject"}
              </Button>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ApprovalReviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
          <div className="h-48 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="h-72 animate-pulse rounded-lg bg-muted lg:col-span-1" />
      </div>
    </div>
  );
}
