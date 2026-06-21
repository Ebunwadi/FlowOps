import { z } from "zod";

import { ValidationError } from "../../common/errors/httpErrors";

export const WORKFLOW_REQUEST_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;

/**
 * Raw submitted value for a single field. Field-type-specific validation against
 * the template definition happens in the dynamic validator (Issue 3); here we only
 * guarantee the value is one of the JSON-serialisable shapes we allow to be stored.
 */
const submittedValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.union([z.string(), z.number(), z.boolean()])),
  z.record(z.any()),
]);

const submittedRequestValueSchema = z.object({
  workflowFieldId: z.string().uuid(),
  value: submittedValueSchema,
});

const titleSchema = z.string().trim().min(1).max(150);

const submitValuesSchema = z
  .array(submittedRequestValueSchema)
  .min(1, "At least one field value is required")
  .superRefine((values, context) => {
    addDuplicateFieldIssue(context, findDuplicateFieldIds(values));
  });

const draftValuesSchema = z
  .array(submittedRequestValueSchema)
  .superRefine((values, context) => {
    addDuplicateFieldIssue(context, findDuplicateFieldIds(values));
  });

/** Body for submitting a workflow request for approval. Requires at least one value. */
export const submitWorkflowRequestSchema = z.object({
  workflowTemplateId: z.string().uuid(),
  title: titleSchema.optional(),
  values: submitValuesSchema,
});

/** Body for creating a draft request. Values are optional and may be incomplete. */
export const saveDraftWorkflowRequestSchema = z.object({
  workflowTemplateId: z.string().uuid(),
  title: titleSchema.optional(),
  values: draftValuesSchema.optional().default([]),
});

/** Body for updating an existing draft request. All fields optional. */
export const updateDraftWorkflowRequestSchema = z
  .object({
    title: titleSchema.optional(),
    values: draftValuesSchema.optional(),
  })
  .refine((value) => value.title !== undefined || value.values !== undefined, {
    message: "At least one field must be provided",
  });

export const workflowRequestParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listWorkflowRequestsQuerySchema = z.object({
  status: z.enum(WORKFLOW_REQUEST_STATUSES).optional(),
  workflowTemplateId: z.string().uuid().optional(),
  requesterId: z.string().uuid().optional(),
  search: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type SubmittedRequestValue = z.infer<typeof submittedRequestValueSchema>;
export type SubmitWorkflowRequestBody = z.infer<typeof submitWorkflowRequestSchema>;
export type SaveDraftWorkflowRequestBody = z.infer<typeof saveDraftWorkflowRequestSchema>;
export type UpdateDraftWorkflowRequestBody = z.infer<typeof updateDraftWorkflowRequestSchema>;
export type WorkflowRequestParams = z.infer<typeof workflowRequestParamsSchema>;
export type ListWorkflowRequestsQuery = z.infer<typeof listWorkflowRequestsQuerySchema>;

function addDuplicateFieldIssue(context: z.RefinementCtx, message: string | null): void {
  if (!message) {
    return;
  }

  context.addIssue({
    code: z.ZodIssueCode.custom,
    message,
    path: ["values"],
  });
}

export function findDuplicateFieldIds(
  values: Array<{ workflowFieldId: string }>,
): string | null {
  const seen = new Set<string>();

  for (const entry of values) {
    if (seen.has(entry.workflowFieldId)) {
      return `Duplicate value submitted for field: ${entry.workflowFieldId}`;
    }

    seen.add(entry.workflowFieldId);
  }

  return null;
}

/** Service-layer guard against duplicate field values for a single request. */
export function assertUniqueRequestValues(
  values: Array<{ workflowFieldId: string }>,
): void {
  const duplicate = findDuplicateFieldIds(values);

  if (duplicate) {
    throw new ValidationError(duplicate);
  }
}
