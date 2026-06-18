import { z } from "zod";

import { ValidationError } from "../../common/errors/httpErrors";

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

export const WORKFLOW_TEMPLATE_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
] as const;

const workflowFieldKeySchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(
    /^[a-z][a-z0-9_]*$/,
    "Field key must start with a letter and use lowercase letters, numbers, and underscores only",
  );

const workflowFieldSchema = z.object({
  label: z.string().trim().min(2).max(100),
  fieldKey: workflowFieldKeySchema,
  fieldType: z.enum(WORKFLOW_FIELD_TYPES),
  helpText: z.string().trim().max(500).optional(),
  placeholder: z.string().trim().max(200).optional(),
  isRequired: z.boolean().default(false),
  options: z.array(z.string().trim().min(1)).optional(),
  validationRules: z.record(z.any()).optional(),
  fieldOrder: z.number().int().positive(),
});

const workflowStepSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  stepOrder: z.number().int().positive(),
  approverRoleId: z.string().uuid(),
  slaHours: z.number().int().positive().optional(),
  allowDelegation: z.boolean().default(false),
  condition: z.record(z.any()).optional(),
});

const workflowFieldsSchema = z
  .array(workflowFieldSchema)
  .min(1, "At least one form field is required")
  .superRefine((fields, context) => {
    addDuplicateIssues(context, findDuplicateFieldOrders(fields), ["fields"]);
    addDuplicateIssues(context, findDuplicateFieldKeys(fields), ["fields"]);
  });

const workflowStepsSchema = z
  .array(workflowStepSchema)
  .min(1, "At least one approval step is required")
  .superRefine((steps, context) => {
    addDuplicateIssues(context, findDuplicateStepOrders(steps), ["steps"]);
  });

export const createWorkflowTemplateSchema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().max(500).optional(),
  category: z.string().trim().max(50).optional(),
  fields: workflowFieldsSchema,
  steps: workflowStepsSchema,
});

export const updateWorkflowTemplateSchema = z
  .object({
    name: z.string().trim().min(3).max(100).optional(),
    description: z.string().trim().max(500).optional(),
    category: z.string().trim().max(50).optional(),
    fields: workflowFieldsSchema.optional(),
    steps: workflowStepsSchema.optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.description !== undefined ||
      value.category !== undefined ||
      value.fields !== undefined ||
      value.steps !== undefined,
    {
      message: "At least one field must be provided",
    },
  );

export const workflowTemplateParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listWorkflowTemplatesQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  status: z.enum(WORKFLOW_TEMPLATE_STATUSES).optional(),
  category: z.string().trim().min(1).max(50).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateWorkflowTemplateBody = z.infer<typeof createWorkflowTemplateSchema>;
export type UpdateWorkflowTemplateBody = z.infer<typeof updateWorkflowTemplateSchema>;
export type WorkflowTemplateParams = z.infer<typeof workflowTemplateParamsSchema>;
export type ListWorkflowTemplatesQuery = z.infer<typeof listWorkflowTemplatesQuerySchema>;
export type WorkflowFieldInput = z.infer<typeof workflowFieldSchema>;
export type WorkflowStepInput = z.infer<typeof workflowStepSchema>;

function addDuplicateIssues(
  context: z.RefinementCtx,
  message: string | null,
  path: (string | number)[],
): void {
  if (!message) {
    return;
  }

  context.addIssue({
    code: z.ZodIssueCode.custom,
    message,
    path,
  });
}

export function findDuplicateFieldOrders(
  fields: Array<{ fieldOrder: number }>,
): string | null {
  return findDuplicateValues(
    fields.map((field) => field.fieldOrder),
    "fieldOrder",
  );
}

export function findDuplicateFieldKeys(
  fields: Array<{ fieldKey: string }>,
): string | null {
  return findDuplicateValues(
    fields.map((field) => field.fieldKey),
    "fieldKey",
  );
}

export function findDuplicateStepOrders(
  steps: Array<{ stepOrder: number }>,
): string | null {
  return findDuplicateValues(
    steps.map((step) => step.stepOrder),
    "stepOrder",
  );
}

function findDuplicateValues(values: Array<string | number>, label: string): string | null {
  const seen = new Set<string | number>();

  for (const value of values) {
    if (seen.has(value)) {
      return `Duplicate ${label} value: ${value}`;
    }

    seen.add(value);
  }

  return null;
}

/** Service-layer guard for duplicate field order and field keys. */
export function assertUniqueWorkflowFields(
  fields: Array<{ fieldOrder: number; fieldKey: string }>,
): void {
  const duplicateOrder = findDuplicateFieldOrders(fields);

  if (duplicateOrder) {
    throw new ValidationError(duplicateOrder);
  }

  const duplicateKey = findDuplicateFieldKeys(fields);

  if (duplicateKey) {
    throw new ValidationError(duplicateKey);
  }
}

/** Service-layer guard for duplicate approval step order. */
export function assertUniqueWorkflowSteps(steps: Array<{ stepOrder: number }>): void {
  const duplicateOrder = findDuplicateStepOrders(steps);

  if (duplicateOrder) {
    throw new ValidationError(duplicateOrder);
  }
}
