import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { FormProvider, useForm, type FieldPath } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import {
  createWorkflowTemplate,
  updateWorkflowTemplate,
} from "@/api/workflow-templates";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createEmptyField,
  createEmptyStep,
  createWorkflowTemplateSchema,
  toCreateWorkflowTemplatePayload,
  type CreateWorkflowTemplateFormValues,
} from "@/schemas/workflow-template.schema";
import { ApiClientError } from "@/types/api";
import type { OrganisationRole } from "@/types/member";
import type { WorkflowTemplateStatus } from "@/types/workflow-template";

import { WorkflowFieldsBuilder } from "./workflow-fields-builder";
import { WorkflowStepsBuilder } from "./workflow-steps-builder";
import { WorkflowTemplateBasicDetails } from "./workflow-template-basic-details";
import { WorkflowTemplatePreview } from "./workflow-template-preview";

interface WorkflowTemplateFormProps {
  mode: "create" | "edit";
  templateId?: string;
  initialValues?: CreateWorkflowTemplateFormValues;
  previewStatus?: WorkflowTemplateStatus;
  roles: OrganisationRole[];
  rolesLoading: boolean;
  cancelTo: string;
}

export function WorkflowTemplateForm({
  mode,
  templateId,
  initialValues,
  previewStatus = "DRAFT",
  roles,
  rolesLoading,
  cancelTo,
}: WorkflowTemplateFormProps) {
  const navigate = useNavigate();
  const isEdit = mode === "edit";

  const form = useForm<CreateWorkflowTemplateFormValues>({
    resolver: zodResolver(createWorkflowTemplateSchema),
    defaultValues: initialValues ?? {
      name: "",
      description: "",
      category: "",
      fields: [createEmptyField(1)],
      steps: [createEmptyStep(1)],
    },
    mode: "onSubmit",
  });

  const submitMutation = useMutation({
    mutationFn: (values: CreateWorkflowTemplateFormValues) => {
      const payload = toCreateWorkflowTemplatePayload(values);

      if (isEdit && templateId) {
        return updateWorkflowTemplate(templateId, payload);
      }

      return createWorkflowTemplate(payload);
    },
    onSuccess: (template) => {
      navigate(`/workflows/${template.id}`, {
        replace: true,
        state: isEdit ? { updated: true } : { created: true },
      });
    },
  });

  const submitError =
    submitMutation.error instanceof ApiClientError
      ? submitMutation.error.message
      : submitMutation.error instanceof Error
        ? submitMutation.error.message
        : null;

  const onSubmit = form.handleSubmit(async (values) => {
    submitMutation.reset();

    try {
      await submitMutation.mutateAsync(values);
    } catch (error) {
      if (error instanceof ApiClientError) {
        error.fieldErrors.forEach(({ field, message }) => {
          form.setError(field as FieldPath<CreateWorkflowTemplateFormValues>, {
            message,
          });
        });
      }
    }
  });

  return (
    <FormProvider {...form}>
      <form className="space-y-6" onSubmit={onSubmit}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Basic details</CardTitle>
                <CardDescription>
                  Name and describe the workflow so your team knows when to use it.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WorkflowTemplateBasicDetails />
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Form fields</CardTitle>
                <CardDescription>
                  Define the information requesters must provide when submitting a request.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WorkflowFieldsBuilder />
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Approval steps</CardTitle>
                <CardDescription>
                  Set the review sequence and assign an approver role for each step.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WorkflowStepsBuilder roles={roles} rolesLoading={rolesLoading} />
              </CardContent>
            </Card>
          </div>

          <div className="xl:sticky xl:top-6 xl:self-start">
            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Preview</CardTitle>
                <CardDescription>
                  Live preview of the request form and approval flow.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WorkflowTemplatePreview previewStatus={previewStatus} roles={roles} />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 -mx-6 border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-h-5">
              {submitError ? (
                <p className="text-sm text-red-600">{submitError}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isEdit
                    ? "Save your changes to update this workflow template."
                    : "Templates are saved as drafts until activated."}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={submitMutation.isPending}
                onClick={() => {
                  navigate(cancelTo);
                }}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={submitMutation.isPending} type="submit">
                {submitMutation.isPending
                  ? isEdit
                    ? "Saving…"
                    : "Creating…"
                  : isEdit
                    ? "Save changes"
                    : "Create workflow"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
