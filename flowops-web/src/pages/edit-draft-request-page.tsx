import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";

import {
  getWorkflowRequestById,
  submitDraftWorkflowRequest,
  updateDraftWorkflowRequest,
} from "@/api/workflow-requests";
import { getWorkflowTemplateById } from "@/api/workflow-templates";
import { useAuth } from "@/auth/use-auth";
import { useOrganisation } from "@/auth/use-organisation";
import {
  DynamicRequestForm,
  type DynamicRequestFormSubmission,
  type RequestFieldValue,
} from "@/components/requests/dynamic-request-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { formatApiErrorMessage } from "@/lib/api-errors";
import { ApiClientError } from "@/types/api";
import type { WorkflowRequestValueDetail } from "@/types/workflow-request";
import { isEditableRequestStatus } from "@/types/workflow-request";
import type { WorkflowFieldType } from "@/types/workflow-template";

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

function toFormValue(
  fieldType: WorkflowFieldType,
  value: unknown,
): RequestFieldValue {
  if (fieldType === "CHECKBOX") {
    return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function buildInitialValues(
  values: WorkflowRequestValueDetail[],
): Record<string, RequestFieldValue> {
  const initial: Record<string, RequestFieldValue> = {};
  for (const value of values) {
    initial[value.workflowFieldId] = toFormValue(value.fieldType, value.value);
  }
  return initial;
}

export function EditDraftRequestPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrganisation } = useOrganisation();
  const { profile } = useAuth();

  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>(
    {},
  );
  const [formError, setFormError] = useState<string | null>(null);

  const requestQuery = useQuery({
    queryKey: ["workflow-request", id],
    queryFn: () => getWorkflowRequestById(id!),
    enabled: Boolean(id),
  });

  const request = requestQuery.data;
  const templateId = request?.workflowTemplate.id;
  const isChangesRequested = request?.status === "CHANGES_REQUESTED";

  const templateQuery = useQuery({
    queryKey: ["workflow-templates", templateId],
    queryFn: () => getWorkflowTemplateById(templateId!),
    enabled: Boolean(templateId),
  });

  const initialValues = useMemo(
    () => (request ? buildInitialValues(request.values) : undefined),
    [request],
  );

  const saveDraftMutation = useMutation({
    mutationFn: (submission: DynamicRequestFormSubmission) =>
      updateDraftWorkflowRequest(id!, {
        title: submission.title,
        values: submission.values,
      }),
    onMutate: () => {
      setServerFieldErrors({});
      setFormError(null);
    },
    onSuccess: () => {
      navigate(`/requests/${id}`, {
        state: isChangesRequested ? { changesSaved: true } : { draftSaved: true },
      });
    },
    onError: (error) => {
      setServerFieldErrors(toFieldErrorMap(error));
      setFormError(formatApiErrorMessage(error));
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (submission: DynamicRequestFormSubmission) => {
      await updateDraftWorkflowRequest(id!, {
        title: submission.title,
        values: submission.values,
      });
      return submitDraftWorkflowRequest(id!);
    },
    onMutate: () => {
      setServerFieldErrors({});
      setFormError(null);
    },
    onSuccess: () => {
      navigate(`/requests/${id}`, {
        state: isChangesRequested ? { resubmitted: true } : { submitted: true },
      });
    },
    onError: (error) => {
      setServerFieldErrors(toFieldErrorMap(error));
      setFormError(formatApiErrorMessage(error));
    },
  });

  if (!currentOrganisation) {
    return <Navigate replace to="/organisation/setup" />;
  }

  if (!id) {
    return <Navigate replace to="/requests" />;
  }

  if (requestQuery.isLoading || (request && templateQuery.isLoading)) {
    return <EditDraftSkeleton />;
  }

  if (requestQuery.isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-[28px] font-semibold tracking-tight">Edit request</h1>
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

  if (!request) {
    return null;
  }

  const isOwner = profile?.id === request.requester.id;

  if (!isEditableRequestStatus(request.status) || !isOwner) {
    return <Navigate replace to={`/requests/${id}`} />;
  }

  if (templateQuery.isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-[28px] font-semibold tracking-tight">Edit request</h1>
        <DismissibleAlert
          messageKey={formatApiErrorMessage(templateQuery.error)}
          variant="error"
        >
          {formatApiErrorMessage(templateQuery.error)}
        </DismissibleAlert>
        <Button asChild type="button" variant="outline">
          <Link to={`/requests/${id}`}>Back to request</Link>
        </Button>
      </div>
    );
  }

  if (!templateQuery.data) {
    return null;
  }

  const pageTitle = isChangesRequested ? "Update request" : "Edit draft";
  const pageDescription = isChangesRequested
    ? "An approver asked for changes. Update the request and resubmit it for approval."
    : "Update your draft and submit it when you are ready.";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link className="hover:text-foreground" to={`/requests/${id}`}>
            {request.title ?? "Untitled request"}
          </Link>
          <span className="mx-2">/</span>
          <span>{pageTitle}</span>
        </p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-foreground">
          {pageTitle}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {request.workflowTemplate.name}. {pageDescription}
        </p>
      </div>

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
        initialTitle={request.title ?? ""}
        initialValues={initialValues}
        isSavingDraft={saveDraftMutation.isPending}
        isSubmitting={submitMutation.isPending}
        onCancel={() => {
          navigate(`/requests/${id}`);
        }}
        onSaveDraft={(submission) => {
          saveDraftMutation.mutate(submission);
        }}
        onSubmit={(submission) => {
          submitMutation.mutate(submission);
        }}
        saveDraftLabel={isChangesRequested ? "Save changes" : undefined}
        savingDraftLabel={isChangesRequested ? "Saving…" : undefined}
        serverFieldErrors={serverFieldErrors}
        submitLabel={isChangesRequested ? "Resubmit for approval" : undefined}
        submittingLabel={isChangesRequested ? "Resubmitting…" : undefined}
        template={templateQuery.data}
      />
    </div>
  );
}

function EditDraftSkeleton() {
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
