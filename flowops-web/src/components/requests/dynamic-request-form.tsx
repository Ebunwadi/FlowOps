import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormFieldError } from "@/components/workflows/form-field-error";
import type {
  SubmittedRequestValueInput,
} from "@/types/workflow-request";
import type {
  WorkflowTemplateDetail,
  WorkflowTemplateField,
} from "@/types/workflow-template";

export type RequestFieldValue = string | string[];

type FieldValue = RequestFieldValue;

export interface DynamicRequestFormSubmission {
  title: string | undefined;
  values: SubmittedRequestValueInput[];
}

interface DynamicRequestFormProps {
  template: WorkflowTemplateDetail;
  serverFieldErrors: Record<string, string>;
  isSubmitting: boolean;
  isSavingDraft: boolean;
  initialValues?: Record<string, FieldValue>;
  initialTitle?: string;
  saveDraftLabel?: string;
  savingDraftLabel?: string;
  submitLabel?: string;
  submittingLabel?: string;
  showSaveDraft?: boolean;
  onSubmit: (submission: DynamicRequestFormSubmission) => void;
  onSaveDraft: (submission: DynamicRequestFormSubmission) => void;
  onCancel: () => void;
}

function parseOptions(options: unknown): string[] {
  if (!Array.isArray(options)) {
    return [];
  }
  return options.filter((option): option is string => typeof option === "string");
}

function buildInitialValues(
  fields: WorkflowTemplateField[],
  provided?: Record<string, FieldValue>,
): Record<string, FieldValue> {
  const initial: Record<string, FieldValue> = {};
  for (const field of fields) {
    const supplied = provided?.[field.id];
    if (supplied !== undefined) {
      initial[field.id] = supplied;
      continue;
    }
    initial[field.id] = field.fieldType === "CHECKBOX" ? [] : "";
  }
  return initial;
}

function isFieldEmpty(field: WorkflowTemplateField, value: FieldValue): boolean {
  if (field.fieldType === "CHECKBOX") {
    return !Array.isArray(value) || value.length === 0;
  }
  return typeof value !== "string" || value.trim() === "";
}

function buildSubmissionValues(
  fields: WorkflowTemplateField[],
  values: Record<string, FieldValue>,
): SubmittedRequestValueInput[] {
  const submission: SubmittedRequestValueInput[] = [];

  for (const field of fields) {
    if (field.fieldType === "FILE_UPLOAD") {
      continue;
    }

    const raw = values[field.id];

    if (isFieldEmpty(field, raw)) {
      continue;
    }

    if (field.fieldType === "CHECKBOX") {
      submission.push({ workflowFieldId: field.id, value: raw });
      continue;
    }

    const text = (raw as string).trim();

    if (field.fieldType === "NUMBER") {
      submission.push({ workflowFieldId: field.id, value: Number(text) });
      continue;
    }

    submission.push({ workflowFieldId: field.id, value: text });
  }

  return submission;
}

export function DynamicRequestForm({
  template,
  serverFieldErrors,
  isSubmitting,
  isSavingDraft,
  initialValues,
  initialTitle,
  saveDraftLabel = "Save draft",
  savingDraftLabel = "Saving…",
  submitLabel = "Submit request",
  submittingLabel = "Submitting…",
  showSaveDraft = true,
  onSubmit,
  onSaveDraft,
  onCancel,
}: DynamicRequestFormProps) {
  const fields = useMemo(
    () => [...template.fields].sort((a, b) => a.fieldOrder - b.fieldOrder),
    [template.fields],
  );

  const [title, setTitle] = useState(initialTitle ?? "");
  const [values, setValues] = useState<Record<string, FieldValue>>(() =>
    buildInitialValues(fields, initialValues),
  );
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const isBusy = isSubmitting || isSavingDraft;

  const setFieldValue = (field: WorkflowTemplateField, value: FieldValue) => {
    setValues((current) => ({ ...current, [field.id]: value }));
    if (clientErrors[field.fieldKey]) {
      setClientErrors((current) => {
        const next = { ...current };
        delete next[field.fieldKey];
        return next;
      });
    }
  };

  const toggleCheckbox = (field: WorkflowTemplateField, option: string) => {
    const current = Array.isArray(values[field.id])
      ? (values[field.id] as string[])
      : [];
    const next = current.includes(option)
      ? current.filter((entry) => entry !== option)
      : [...current, option];
    setFieldValue(field, next);
  };

  const validateRequired = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    for (const field of fields) {
      if (!field.isRequired || field.fieldType === "FILE_UPLOAD") {
        continue;
      }
      if (isFieldEmpty(field, values[field.id])) {
        errors[field.fieldKey] = `${field.label} is required.`;
      }
    }
    return errors;
  };

  const handleSubmit = () => {
    const errors = validateRequired();
    setClientErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    onSubmit({
      title: title.trim() === "" ? undefined : title.trim(),
      values: buildSubmissionValues(fields, values),
    });
  };

  const handleSaveDraft = () => {
    setClientErrors({});
    onSaveDraft({
      title: title.trim() === "" ? undefined : title.trim(),
      values: buildSubmissionValues(fields, values),
    });
  };

  const errorFor = (field: WorkflowTemplateField): string | undefined =>
    clientErrors[field.fieldKey] ?? serverFieldErrors[field.fieldKey];

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      <Card>
        <CardContent className="space-y-5 p-5">
          <div className="space-y-1.5">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="request-title"
            >
              Request title{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="request-title"
              maxLength={200}
              onChange={(event) => {
                setTitle(event.target.value);
              }}
              placeholder="Give this request a short, recognisable title"
              value={title}
            />
            <p className="text-xs text-muted-foreground">
              Helps you and approvers identify this request later.
            </p>
          </div>

          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This workflow has no fields to fill in.
            </p>
          ) : (
            fields.map((field) => (
              <RequestField
                error={errorFor(field)}
                field={field}
                key={field.id}
                onCheckboxToggle={(option) => {
                  toggleCheckbox(field, option);
                }}
                onValueChange={(value) => {
                  setFieldValue(field, value);
                }}
                value={values[field.id]}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-5">
          <h2 className="text-sm font-semibold text-foreground">Attachments</h2>
          <div className="rounded-md border border-dashed bg-muted/40 px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              File attachments will be available in a later release.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button
          disabled={isBusy}
          onClick={onCancel}
          type="button"
          variant="ghost"
        >
          Cancel
        </Button>
        {showSaveDraft ? (
          <Button
            disabled={isBusy}
            onClick={handleSaveDraft}
            type="button"
            variant="outline"
          >
            {isSavingDraft ? savingDraftLabel : saveDraftLabel}
          </Button>
        ) : null}
        <Button disabled={isBusy} type="submit">
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}

interface RequestFieldProps {
  field: WorkflowTemplateField;
  value: FieldValue;
  error?: string;
  onValueChange: (value: string) => void;
  onCheckboxToggle: (option: string) => void;
}

function RequestField({
  field,
  value,
  error,
  onValueChange,
  onCheckboxToggle,
}: RequestFieldProps) {
  const inputId = `field-${field.id}`;
  const stringValue = typeof value === "string" ? value : "";
  const arrayValue = Array.isArray(value) ? value : [];
  const options = parseOptions(field.options);

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground" htmlFor={inputId}>
        {field.label}
        {field.isRequired ? (
          <span aria-hidden className="ml-0.5 text-red-600">
            *
          </span>
        ) : null}
      </label>

      {renderFieldControl({
        field,
        inputId,
        stringValue,
        arrayValue,
        options,
        onValueChange,
        onCheckboxToggle,
      })}

      {field.helpText ? (
        <p className="text-xs text-muted-foreground">{field.helpText}</p>
      ) : null}

      <FormFieldError message={error} />
    </div>
  );
}

interface RenderFieldControlArgs {
  field: WorkflowTemplateField;
  inputId: string;
  stringValue: string;
  arrayValue: string[];
  options: string[];
  onValueChange: (value: string) => void;
  onCheckboxToggle: (option: string) => void;
}

function renderFieldControl({
  field,
  inputId,
  stringValue,
  arrayValue,
  options,
  onValueChange,
  onCheckboxToggle,
}: RenderFieldControlArgs) {
  switch (field.fieldType) {
    case "LONG_TEXT":
      return (
        <Textarea
          id={inputId}
          onChange={(event) => {
            onValueChange(event.target.value);
          }}
          placeholder={field.placeholder ?? ""}
          value={stringValue}
        />
      );

    case "NUMBER":
      return (
        <Input
          id={inputId}
          onChange={(event) => {
            onValueChange(event.target.value);
          }}
          placeholder={field.placeholder ?? ""}
          type="number"
          value={stringValue}
        />
      );

    case "DATE":
      return (
        <Input
          id={inputId}
          onChange={(event) => {
            onValueChange(event.target.value);
          }}
          type="date"
          value={stringValue}
        />
      );

    case "DROPDOWN":
      return (
        <Select
          id={inputId}
          onChange={(event) => {
            onValueChange(event.target.value);
          }}
          value={stringValue}
        >
          <option value="">Select an option…</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      );

    case "RADIO":
      return (
        <div className="space-y-2 pt-1" id={inputId} role="radiogroup">
          {options.map((option) => (
            <label
              className="flex items-center gap-2 text-sm text-foreground"
              key={option}
            >
              <input
                checked={stringValue === option}
                name={inputId}
                onChange={() => {
                  onValueChange(option);
                }}
                type="radio"
                value={option}
              />
              {option}
            </label>
          ))}
        </div>
      );

    case "CHECKBOX":
      return (
        <div className="space-y-2 pt-1" id={inputId}>
          {options.map((option) => (
            <label
              className="flex items-center gap-2 text-sm text-foreground"
              key={option}
            >
              <input
                checked={arrayValue.includes(option)}
                onChange={() => {
                  onCheckboxToggle(option);
                }}
                type="checkbox"
                value={option}
              />
              {option}
            </label>
          ))}
        </div>
      );

    case "FILE_UPLOAD":
      return (
        <Input
          disabled
          id={inputId}
          placeholder="File uploads coming in a later release"
          type="text"
        />
      );

    case "SHORT_TEXT":
    default:
      return (
        <Input
          id={inputId}
          onChange={(event) => {
            onValueChange(event.target.value);
          }}
          placeholder={field.placeholder ?? ""}
          value={stringValue}
        />
      );
  }
}
