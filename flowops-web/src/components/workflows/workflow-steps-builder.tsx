import { useFieldArray, useFormContext } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createEmptyStep,
  reorderItems,
  type CreateWorkflowTemplateFormValues,
} from "@/schemas/workflow-template.schema";
import type { OrganisationRole } from "@/types/member";

import { FormFieldError } from "./form-field-error";

interface WorkflowStepsBuilderProps {
  roles: OrganisationRole[];
  rolesLoading: boolean;
}

export function WorkflowStepsBuilder({
  roles,
  rolesLoading,
}: WorkflowStepsBuilderProps) {
  const {
    control,
    register,
    watch,
    formState: { errors },
  } = useFormContext<CreateWorkflowTemplateFormValues>();

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "steps",
  });

  const watchedSteps = watch("steps");

  const handleAddStep = () => {
    append(createEmptyStep(fields.length + 1));
  };

  const handleMoveStep = (index: number, direction: "up" | "down") => {
    const reordered = reorderItems(watchedSteps, index, direction, "stepOrder");
    replace(reordered);
  };

  const handleRemoveStep = (index: number) => {
    remove(index);
    const next = watchedSteps
      .filter((_, stepIndex) => stepIndex !== index)
      .map((step, stepIndex) => ({
        ...step,
        stepOrder: stepIndex + 1,
      }));
    replace(next);
  };

  return (
    <div className="space-y-4">
      {errors.steps?.root?.message ? (
        <DismissibleAlert messageKey={errors.steps.root.message} variant="error">
          {errors.steps.root.message}
        </DismissibleAlert>
      ) : null}

      {typeof errors.steps?.message === "string" ? (
        <DismissibleAlert messageKey={errors.steps.message} variant="error">
          {errors.steps.message}
        </DismissibleAlert>
      ) : null}

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          No approval steps yet. Add a step to define who reviews each request.
        </div>
      ) : null}

      <div className="space-y-4">
        {fields.map((field, index) => {
          const stepErrors = errors.steps?.[index];

          return (
            <div
              key={field.id}
              className="rounded-lg border bg-muted/10 p-4 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">
                  Step {index + 1}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    disabled={index === 0}
                    onClick={() => {
                      handleMoveStep(index, "up");
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Move up
                  </Button>
                  <Button
                    disabled={index === fields.length - 1}
                    onClick={() => {
                      handleMoveStep(index, "down");
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Move down
                  </Button>
                  <Button
                    onClick={() => {
                      handleRemoveStep(index);
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Remove
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor={`step-name-${index}`}>Step name</Label>
                  <Input
                    id={`step-name-${index}`}
                    placeholder="e.g. Manager approval"
                    {...register(`steps.${index}.name`)}
                  />
                  <FormFieldError message={stepErrors?.name?.message} />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor={`step-description-${index}`}>Description</Label>
                  <Textarea
                    id={`step-description-${index}`}
                    placeholder="Optional instructions for approvers"
                    rows={2}
                    {...register(`steps.${index}.description`)}
                  />
                  <FormFieldError message={stepErrors?.description?.message} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`step-role-${index}`}>Approver role</Label>
                  <Select
                    disabled={rolesLoading}
                    id={`step-role-${index}`}
                    {...register(`steps.${index}.approverRoleId`)}
                  >
                    <option value="">
                      {rolesLoading ? "Loading roles…" : "Select approver role"}
                    </option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </Select>
                  <FormFieldError message={stepErrors?.approverRoleId?.message} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`step-sla-${index}`}>SLA hours</Label>
                  <Input
                    id={`step-sla-${index}`}
                    min={1}
                    placeholder="Optional"
                    type="number"
                    {...register(`steps.${index}.slaHours`)}
                  />
                  <FormFieldError message={stepErrors?.slaHours?.message} />
                </div>

                <div className="flex items-center gap-2 sm:col-span-2">
                  <input
                    className="h-4 w-4 rounded border-input"
                    id={`step-delegation-${index}`}
                    type="checkbox"
                    {...register(`steps.${index}.allowDelegation`)}
                  />
                  <Label htmlFor={`step-delegation-${index}`}>Allow delegation</Label>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Button onClick={handleAddStep} type="button" variant="outline">
        Add step
      </Button>
    </div>
  );
}
