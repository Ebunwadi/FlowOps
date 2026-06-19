import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { FormProvider, useForm, type FieldPath } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { createWorkflowTemplate } from "@/api/workflow-templates";
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

import { WorkflowFieldsBuilder } from "./workflow-fields-builder";
import { WorkflowStepsBuilder } from "./workflow-steps-builder";
import { WorkflowTemplateBasicDetails } from "./workflow-template-basic-details";
import { WorkflowTemplatePreview } from "./workflow-template-preview";

interface WorkflowTemplateFormProps {
  roles: OrganisationRole[];
  rolesLoading: boolean;
}

export function WorkflowTemplateForm({
  roles,
  rolesLoading,
}: WorkflowTemplateFormProps) {
  const navigate = useNavigate();

  const form = useForm<CreateWorkflowTemplateFormValues>({
    resolver: zodResolver(createWorkflowTemplateSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      fields: [createEmptyField(1)],
      steps: [createEmptyStep(1)],
    },
    mode: "onSubmit",
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateWorkflowTemplateFormValues) =>
      createWorkflowTemplate(toCreateWorkflowTemplatePayload(values)),
    onSuccess: (template) => {
      navigate(`/workflows/${template.id}`, {
        replace: true,
        state: { created: true },
      });
    },
  });

  const submitError =
    createMutation.error instanceof ApiClientError
      ? createMutation.error.message
      : createMutation.error instanceof Error
        ? createMutation.error.message
        : null;

  const onSubmit = form.handleSubmit(async (values) => {
    createMutation.reset();

    try {
      await createMutation.mutateAsync(values);
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
                <WorkflowTemplatePreview roles={roles} />
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
                  Templates are saved as drafts until activated.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={createMutation.isPending}
                onClick={() => {
                  navigate("/workflows");
                }}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={createMutation.isPending} type="submit">
                {createMutation.isPending ? "Creating…" : "Create workflow"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
