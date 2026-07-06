import { z } from "zod";

import {
  findDuplicateFieldKeys,
  findDuplicateFieldOrders,
  findDuplicateStepOrders,
  WORKFLOW_FIELD_TYPES,
} from "../workflows/workflow-template.validation";

const aiGeneratedFieldSchema = z.object({
  label: z.string().trim().min(2).max(100),
  fieldKey: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(
      /^[a-z][a-z0-9_]*$/,
      "Field key must start with a letter and use lowercase letters, numbers, and underscores only",
    ),
  fieldType: z.enum(WORKFLOW_FIELD_TYPES),
  helpText: z.string().trim().max(500).optional(),
  placeholder: z.string().trim().max(200).optional(),
  isRequired: z.boolean().default(false),
  options: z.array(z.string().trim().min(1)).optional(),
  fieldOrder: z.number().int().positive(),
});

const aiGeneratedStepSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  stepOrder: z.number().int().positive(),
  suggestedApproverRole: z.string().trim().min(1).max(100).optional(),
});

const aiGeneratedFieldsSchema = z
  .array(aiGeneratedFieldSchema)
  .min(1, "At least one form field is required")
  .superRefine((fields, context) => {
    addDuplicateIssue(context, findDuplicateFieldOrders(fields), ["fields"]);
    addDuplicateIssue(context, findDuplicateFieldKeys(fields), ["fields"]);
  });

const aiGeneratedStepsSchema = z
  .array(aiGeneratedStepSchema)
  .min(1, "At least one approval step is required")
  .superRefine((steps, context) => {
    addDuplicateIssue(context, findDuplicateStepOrders(steps), ["steps"]);
  });

export const generatedWorkflowSuggestionSchema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().max(500).optional(),
  category: z.string().trim().max(50).optional(),
  fields: aiGeneratedFieldsSchema,
  steps: aiGeneratedStepsSchema,
});

export const generateWorkflowSuggestionSchema = z.object({
  prompt: z.string().trim().min(10).max(2000),
});

export type GenerateWorkflowSuggestionBody = z.infer<
  typeof generateWorkflowSuggestionSchema
>;
export type GeneratedWorkflowSuggestion = z.infer<
  typeof generatedWorkflowSuggestionSchema
>;

export const requestSummarySchema = z.object({
  summary: z.string().trim().min(20).max(2000),
});

export type RequestSummaryResponse = z.infer<typeof requestSummarySchema>;

export function parseRequestSummary(value: string): string {
  return requestSummarySchema.parse({ summary: value }).summary;
}

export function parseGeneratedWorkflowSuggestion(
  value: unknown,
): GeneratedWorkflowSuggestion {
  return generatedWorkflowSuggestionSchema.parse(value);
}

function addDuplicateIssue(
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
