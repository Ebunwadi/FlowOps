import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";

import {
  saveDraftWorkflowRequest,
  submitWorkflowRequest,
} from "@/api/workflow-requests";
import { getWorkflowTemplateById } from "@/api/workflow-templates";
import { useOrganisation } from "@/auth/use-organisation";
import { usePermissions } from "@/auth/use-permissions";
import {
  DynamicRequestForm,
  type DynamicRequestFormSubmission,
} from "@/components/requests/dynamic-request-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { formatApiErrorMessage } from "@/lib/api-errors";
import { ApiClientError } from "@/types/api";

function toFieldErrorMap(error: unknown): Record<string, string> {
  if (!(error instanceof ApiClientError)) {
    return {};
  }
  const map: Record<string, string> = {};
  for (const fieldError of error.fieldErrors) {
    if (!map[fieldError.field]) {
      map[fieldError.field] = fieldError.message;
    }
  }
  return map;
}

export function SubmitRequestPage() {
  const { workflowTemplateId } = useParams<{ workflowTemplateId: string }>();
  const navigate = useNavigate();
  const { currentOrganisation } = useOrganisation();
  const { hasPermission, membershipAccessLoading } = usePermissions();

  const canStart = hasPermission("requests:create");

  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>(
    {},
  );
  const [formError, setFormError] = useState<string | null>(null);

  const templateQuery = useQuery({
    queryKey: ["workflow-templates", workflowTemplateId],
    queryFn: () => getWorkflowTemplateById(workflowTemplateId!),
    enabled: Boolean(workflowTemplateId) && canStart,
  });

  const submitMutation = useMutation({
    mutationFn: submitWorkflowRequest,
    onMutate: () => {
      setServerFieldErrors({});
      setFormError(null);
    },
    onSuccess: (request) => {
      navigate(`/requests/${request.id}`, { state: { submitted: true } });
    },
    onError: (error) => {
      setServerFieldErrors(toFieldErrorMap(error));
      setFormError(formatApiErrorMessage(error));
    },
  });

  const draftMutation = useMutation({
    mutationFn: saveDraftWorkflowRequest,
    onMutate: () => {
      setServerFieldErrors({});
      setFormError(null);
    },
    onSuccess: (request) => {
      navigate(`/requests/${request.id}`, { state: { draftSaved: true } });
    },
    onError: (error) => {
      setServerFieldErrors(toFieldErrorMap(error));
      setFormError(formatApiErrorMessage(error));
    },
  });

  if (!currentOrganisation) {
    return <Navigate replace to="/organisation/setup" />;
  }

  if (!workflowTemplateId) {
    return <Navigate replace to="/requests/start" />;
  }

  const handleSubmit = (submission: DynamicRequestFormSubmission) => {
    submitMutation.mutate({
      workflowTemplateId,
      title: submission.title,
      values: submission.values,
    });
  };

  const handleSaveDraft = (submission: DynamicRequestFormSubmission) => {
    draftMutation.mutate({
      workflowTemplateId,
      title: submission.title,
      values: submission.values,
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link className="hover:text-foreground" to="/requests/start">
            Start a request
          </Link>
          <span className="mx-2">/</span>
          <span>{templateQuery.data?.name ?? "New request"}</span>
        </p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-foreground">
          {templateQuery.data?.name ?? "New request"}
        </h1>
        {templateQuery.data?.description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {templateQuery.data.description}
          </p>
        ) : null}
      </div>

      {membershipAccessLoading ? (
        <p className="text-sm text-muted-foreground">Loading permissions…</p>
      ) : !canStart ? (
        <DismissibleAlert variant="warning">
          Your role does not include permission to submit workflow requests.
          Contact an organisation admin if you need access.
        </DismissibleAlert>
      ) : templateQuery.isLoading ? (
        <SubmitRequestSkeleton />
      ) : templateQuery.isError ? (
        <div className="space-y-4">
          <DismissibleAlert
            messageKey={formatApiErrorMessage(templateQuery.error)}
            variant="error"
          >
            {formatApiErrorMessage(templateQuery.error)}
          </DismissibleAlert>
          <Button asChild type="button" variant="outline">
            <Link to="/requests/start">Back to workflows</Link>
          </Button>
        </div>
      ) : !templateQuery.data ? null : !templateQuery.data.isActive ? (
        <div className="space-y-4">
          <DismissibleAlert variant="warning">
            This workflow is not currently active, so new requests cannot be
            started from it.
          </DismissibleAlert>
          <Button asChild type="button" variant="outline">
            <Link to="/requests/start">Back to workflows</Link>
          </Button>
        </div>
      ) : (
        <>
          {formError ? (
            <DismissibleAlert
              messageKey={formError}
              onDismiss={() => {
                setFormError(null);
              }}
              variant="error"
            >
              {formError}
            </DismissibleAlert>
          ) : null}

          <DynamicRequestForm
            isSavingDraft={draftMutation.isPending}
            isSubmitting={submitMutation.isPending}
            onCancel={() => {
              navigate("/requests/start");
            }}
            onSaveDraft={handleSaveDraft}
            onSubmit={handleSubmit}
            serverFieldErrors={serverFieldErrors}
            template={templateQuery.data}
          />
        </>
      )}
    </div>
  );
}

function SubmitRequestSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="space-y-2" key={index}>
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
