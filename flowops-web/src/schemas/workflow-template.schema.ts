import { z } from "zod";

import type { WorkflowTemplateDetail } from "@/types/workflow-template";

export const WORKFLOW_FIELD_TYPES = [
  "SHORT_TEXT",
  "LONG_TEXT",
  "NUMBER",
  "DATE",
  "DROPDOWN",
  "CHECKBOX",
  "RADIO",
  "FILE_UPLOAD",
] as const;

export type WorkflowFieldType = (typeof WORKFLOW_FIELD_TYPES)[number];

const OPTION_FIELD_TYPES: WorkflowFieldType[] = ["DROPDOWN", "RADIO", "CHECKBOX"];

const workflowFieldKeySchema = z
  .string()
  .trim()
  .min(2, "Field key must be at least 2 characters")
  .max(80, "Field key must be at most 80 characters")
  .regex(
    /^[a-z][a-z0-9_]*$/,
    "Field key must start with a letter and use lowercase letters, numbers, and underscores only",
  );

const workflowFieldSchema = z
  .object({
    label: z.string().trim().min(2, "Label must be at least 2 characters").max(100),
    fieldKey: workflowFieldKeySchema,
    fieldType: z.enum(WORKFLOW_FIELD_TYPES),
    helpText: z.string().trim().max(500).optional().or(z.literal("")),
    placeholder: z.string().trim().max(200).optional().or(z.literal("")),
    isRequired: z.boolean(),
    options: z.array(z.string().trim().min(1, "Option cannot be empty")),
    fieldOrder: z.number().int().positive(),
  })
  .superRefine((field, context) => {
    if (OPTION_FIELD_TYPES.includes(field.fieldType) && field.options.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one option is required for this field type",
        path: ["options"],
      });
    }
  });

const workflowStepSchema = z.object({
  name: z.string().trim().min(2, "Step name must be at least 2 characters").max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  stepOrder: z.number().int().positive(),
  approverRoleId: z.string().uuid("Select an approver role"),
  slaHours: z
    .union([
      z.literal(""),
      z.coerce.number().int().positive("SLA hours must be a positive number"),
    ])
    .optional(),
  allowDelegation: z.boolean(),
});

const workflowFieldsSchema = z
  .array(workflowFieldSchema)
  .min(1, "At least one form field is required")
  .superRefine((fields, context) => {
    const orders = fields.map((field) => field.fieldOrder);
    const keys = fields.map((field) => field.fieldKey);

    if (new Set(orders).size !== orders.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each field must have a unique order",
        path: [],
      });
    }

    if (new Set(keys).size !== keys.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each field must have a unique field key",
        path: [],
      });
    }
  });

const workflowStepsSchema = z
  .array(workflowStepSchema)
  .min(1, "At least one approval step is required")
  .superRefine((steps, context) => {
    const orders = steps.map((step) => step.stepOrder);

    if (new Set(orders).size !== orders.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each step must have a unique order",
        path: [],
      });
    }
  });

export const createWorkflowTemplateSchema = z.object({
  name: z.string().trim().min(3, "Workflow name must be at least 3 characters").max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  category: z.string().trim().max(50).optional().or(z.literal("")),
  fields: workflowFieldsSchema,
  steps: workflowStepsSchema,
});

export type CreateWorkflowTemplateFormValues = z.infer<typeof createWorkflowTemplateSchema>;
export type WorkflowFieldFormValues = z.infer<typeof workflowFieldSchema>;
export type WorkflowStepFormValues = z.infer<typeof workflowStepSchema>;

export function slugifyFieldKey(label: string): string {
  const slug = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^(\d)/, "field_$1");

  if (!slug) {
    return "";
  }

  const normalized = /^[a-z]/.test(slug) ? slug : `field_${slug}`;
  return normalized.slice(0, 80);
}

export const FIELD_TYPE_LABELS: Record<WorkflowFieldType, string> = {
  SHORT_TEXT: "Short text",
  LONG_TEXT: "Long text",
  NUMBER: "Number",
  DATE: "Date",
  DROPDOWN: "Dropdown",
  CHECKBOX: "Checkbox",
  RADIO: "Radio",
  FILE_UPLOAD: "File upload",
};

export function createEmptyField(fieldOrder: number): WorkflowFieldFormValues {
  return {
    label: "",
    fieldKey: "",
    fieldType: "SHORT_TEXT",
    helpText: "",
    placeholder: "",
    isRequired: false,
    options: [],
    fieldOrder,
  };
}

export function createEmptyStep(stepOrder: number): WorkflowStepFormValues {
  return {
    name: "",
    description: "",
    stepOrder,
    approverRoleId: "",
    slaHours: "",
    allowDelegation: false,
  };
}

export function toCreateWorkflowTemplatePayload(values: CreateWorkflowTemplateFormValues) {
  return {
    name: values.name.trim(),
    description: values.description?.trim() || undefined,
    category: values.category?.trim() || undefined,
    fields: values.fields.map((field) => ({
      label: field.label.trim(),
      fieldKey: field.fieldKey.trim(),
      fieldType: field.fieldType,
      helpText: field.helpText?.trim() || undefined,
      placeholder: field.placeholder?.trim() || undefined,
      isRequired: field.isRequired,
      options: OPTION_FIELD_TYPES.includes(field.fieldType)
        ? field.options.map((option) => option.trim()).filter(Boolean)
        : undefined,
      fieldOrder: field.fieldOrder,
    })),
    steps: values.steps.map((step) => ({
      name: step.name.trim(),
      description: step.description?.trim() || undefined,
      stepOrder: step.stepOrder,
      approverRoleId: step.approverRoleId,
      slaHours:
        step.slaHours === "" || step.slaHours === undefined
          ? undefined
          : Number(step.slaHours),
      allowDelegation: step.allowDelegation,
    })),
  };
}

function parseFieldOptions(options: unknown): string[] {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.filter((option): option is string => typeof option === "string");
}

export function toWorkflowTemplateFormValues(
  template: WorkflowTemplateDetail,
): CreateWorkflowTemplateFormValues {
  return {
    name: template.name,
    description: template.description ?? "",
    category: template.category ?? "",
    fields: [...template.fields]
      .sort((a, b) => a.fieldOrder - b.fieldOrder)
      .map((field) => ({
        label: field.label,
        fieldKey: field.fieldKey,
        fieldType: field.fieldType,
        helpText: field.helpText ?? "",
        placeholder: field.placeholder ?? "",
        isRequired: field.isRequired,
        options: parseFieldOptions(field.options),
        fieldOrder: field.fieldOrder,
      })),
    steps: [...template.steps]
      .sort((a, b) => a.stepOrder - b.stepOrder)
      .map((step) => ({
        name: step.name,
        description: step.description ?? "",
        stepOrder: step.stepOrder,
        approverRoleId: step.approverRoleId,
        slaHours: step.slaHours ?? "",
        allowDelegation: step.allowDelegation,
      })),
  };
}

export function reorderItems<T extends { fieldOrder?: number; stepOrder?: number }>(
  items: T[],
  fromIndex: number,
  direction: "up" | "down",
  orderKey: "fieldOrder" | "stepOrder",
): T[] {
  const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;

  if (toIndex < 0 || toIndex >= items.length) {
    return items;
  }

  const next = [...items];
  [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];

  return next.map((item, index) => ({
    ...item,
    [orderKey]: index + 1,
  }));
}
