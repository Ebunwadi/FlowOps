import { useFormContext } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CreateWorkflowTemplateFormValues } from "@/schemas/workflow-template.schema";

import { FormFieldError } from "./form-field-error";

export function WorkflowTemplateBasicDetails() {
  const {
    register,
    formState: { errors },
  } = useFormContext<CreateWorkflowTemplateFormValues>();

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="workflow-name">Workflow name</Label>
        <Input
          id="workflow-name"
          placeholder="e.g. Equipment request"
          {...register("name")}
        />
        <FormFieldError message={errors.name?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="workflow-description">Description</Label>
        <Textarea
          id="workflow-description"
          placeholder="Describe when and how this workflow should be used."
          rows={3}
          {...register("description")}
        />
        <FormFieldError message={errors.description?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="workflow-category">Category</Label>
        <Input
          id="workflow-category"
          placeholder="e.g. IT, HR, Finance"
          {...register("category")}
        />
        <FormFieldError message={errors.category?.message} />
      </div>
    </div>
  );
}
