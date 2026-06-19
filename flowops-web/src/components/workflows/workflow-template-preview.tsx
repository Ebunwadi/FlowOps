import { useFormContext } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FIELD_TYPE_LABELS,
  type CreateWorkflowTemplateFormValues,
} from "@/schemas/workflow-template.schema";
import type { OrganisationRole } from "@/types/member";
import type { WorkflowTemplateStatus } from "@/types/workflow-template";

import { WorkflowTemplateStatusBadge } from "./workflow-template-status-badge";

interface WorkflowTemplatePreviewProps {
  roles: OrganisationRole[];
  previewStatus?: WorkflowTemplateStatus;
}

function getRoleName(roles: OrganisationRole[], roleId: string): string {
  return roles.find((role) => role.id === roleId)?.name ?? "Unassigned role";
}

export function WorkflowTemplatePreview({ roles, previewStatus = "DRAFT" }: WorkflowTemplatePreviewProps) {
  const { watch } = useFormContext<CreateWorkflowTemplateFormValues>();

  const name = watch("name");
  const description = watch("description");
  const category = watch("category");
  const fields = watch("fields");
  const steps = watch("steps");

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {name.trim() || "Untitled workflow"}
            </h3>
            {category?.trim() ? (
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {category}
              </p>
            ) : null}
          </div>
          <WorkflowTemplateStatusBadge status={previewStatus} />
        </div>
        {description?.trim() ? (
          <p className="mt-3 text-sm text-muted-foreground">{description}</p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Add a description to help your team understand this workflow.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">Request form preview</h4>
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">Form fields will appear here.</p>
        ) : (
          <div className="space-y-4 rounded-lg border bg-background p-4">
            {fields.map((field, index) => (
              <PreviewField key={`${field.fieldKey}-${index}`} field={field} index={index} />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">Approval flow</h4>
        {steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">Approval steps will appear here.</p>
        ) : (
          <ol className="space-y-3">
            {steps.map((step, index) => (
              <li
                key={`${step.name}-${index}`}
                className="rounded-lg border bg-background p-3"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {step.name.trim() || `Step ${index + 1}`}
                    </p>
                    {step.description?.trim() ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {step.description}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      Approver:{" "}
                      <span className="font-medium text-foreground">
                        {getRoleName(roles, step.approverRoleId)}
                      </span>
                    </p>
                    {step.slaHours !== "" && step.slaHours !== undefined ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        SLA: {step.slaHours} hours
                      </p>
                    ) : null}
                    {step.allowDelegation ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Delegation allowed
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

interface PreviewFieldProps {
  field: CreateWorkflowTemplateFormValues["fields"][number];
  index: number;
}

function PreviewField({ field, index }: PreviewFieldProps) {
  const label = field.label.trim() || `Field ${index + 1}`;
  const options = field.options.filter(Boolean);

  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {field.isRequired ? <span className="text-red-600"> *</span> : null}
      </Label>

      {field.fieldType === "SHORT_TEXT" || field.fieldType === "NUMBER" ? (
        <Input disabled placeholder={field.placeholder || undefined} type="text" />
      ) : null}

      {field.fieldType === "LONG_TEXT" ? (
        <Textarea
          disabled
          placeholder={field.placeholder || undefined}
          rows={3}
        />
      ) : null}

      {field.fieldType === "DATE" ? (
        <Input disabled type="date" />
      ) : null}

      {field.fieldType === "DROPDOWN" ? (
        <Select disabled>
          <option>{field.placeholder || "Select an option"}</option>
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </Select>
      ) : null}

      {field.fieldType === "RADIO" ? (
        <div className="space-y-2">
          {options.length > 0 ? (
            options.map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm">
                <input disabled type="radio" />
                {option}
              </label>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">Add options to preview choices.</p>
          )}
        </div>
      ) : null}

      {field.fieldType === "CHECKBOX" ? (
        <div className="space-y-2">
          {options.length > 0 ? (
            options.map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm">
                <input disabled type="checkbox" />
                {option}
              </label>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">Add options to preview choices.</p>
          )}
        </div>
      ) : null}

      {field.fieldType === "FILE_UPLOAD" ? (
        <Input disabled type="file" />
      ) : null}

      {field.helpText?.trim() ? (
        <p className="text-xs text-muted-foreground">{field.helpText}</p>
      ) : null}

      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {FIELD_TYPE_LABELS[field.fieldType]}
      </p>
    </div>
  );
}
