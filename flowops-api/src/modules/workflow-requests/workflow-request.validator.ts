import type { ErrorDetail } from "../../common/errors/appError";
import { ValidationError } from "../../common/errors/httpErrors";
import type { Prisma, WorkflowFieldType } from "../../generated/prisma/client";
import type { SubmittedRequestValue } from "./workflow-request.validation";

/** Minimal shape of a template field needed to validate a submitted value. */
export interface TemplateFieldDefinition {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: WorkflowFieldType;
  isRequired: boolean;
  options: Prisma.JsonValue;
}

export interface ValidatedRequestValue {
  workflowFieldId: string;
  value: Prisma.InputJsonValue;
}

export interface ValidateRequestValuesOptions {
  /**
   * When false (drafts), required fields may be omitted. Any value that *is*
   * provided is still fully validated against its field type and options.
   */
  enforceRequired?: boolean;
}

/**
 * Validates dynamic submitted values against a workflow template's field definitions.
 *
 * The frontend renders the form from the same definitions, but the backend must never
 * trust the client: a user can submit arbitrary payloads via the API. This checks that
 * every submitted field belongs to the template, required fields are present, value
 * types match the field type, and option-based fields only use allowed options.
 *
 * Returns the normalised values ready to be persisted (FILE_UPLOAD and empty optional
 * fields are excluded). Throws a {@link ValidationError} aggregating every problem found.
 */
export function validateRequestValues(
  fields: TemplateFieldDefinition[],
  submittedValues: SubmittedRequestValue[],
  options: ValidateRequestValuesOptions = {},
): ValidatedRequestValue[] {
  const enforceRequired = options.enforceRequired ?? true;
  const errors: ErrorDetail[] = [];

  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  const submittedByFieldId = new Map<string, SubmittedRequestValue>();

  for (const submitted of submittedValues) {
    if (!fieldsById.has(submitted.workflowFieldId)) {
      errors.push({
        field: submitted.workflowFieldId,
        message: `Unknown field for this workflow template: ${submitted.workflowFieldId}`,
      });
      continue;
    }

    if (submittedByFieldId.has(submitted.workflowFieldId)) {
      errors.push({
        field: submitted.workflowFieldId,
        message: `Duplicate value submitted for field: ${submitted.workflowFieldId}`,
      });
      continue;
    }

    submittedByFieldId.set(submitted.workflowFieldId, submitted);
  }

  const validated: ValidatedRequestValue[] = [];

  for (const field of fields) {
    // Full file handling lands in Sprint 8; for now uploads are skipped entirely.
    if (field.fieldType === "FILE_UPLOAD") {
      continue;
    }

    const submitted = submittedByFieldId.get(field.id);

    if (submitted === undefined || isEmptyValue(submitted.value)) {
      if (field.isRequired && enforceRequired) {
        errors.push({ field: field.fieldKey, message: `${field.label} is required` });
      }
      continue;
    }

    const result = validateFieldValue(field, submitted.value);

    if (result.error) {
      errors.push({ field: field.fieldKey, message: result.error });
      continue;
    }

    validated.push({ workflowFieldId: field.id, value: result.value });
  }

  if (errors.length > 0) {
    throw new ValidationError("Submitted values are invalid", errors);
  }

  return validated;
}

interface FieldValueResult {
  value: Prisma.InputJsonValue;
  error?: string;
}

function validateFieldValue(
  field: TemplateFieldDefinition,
  value: SubmittedRequestValue["value"],
): FieldValueResult {
  switch (field.fieldType) {
    case "SHORT_TEXT":
    case "LONG_TEXT": {
      if (typeof value !== "string") {
        return invalid(field, "a text value");
      }
      return { value };
    }

    case "NUMBER": {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return invalid(field, "a number");
      }
      return { value };
    }

    case "DATE": {
      if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
        return invalid(field, "a valid date");
      }
      return { value };
    }

    case "DROPDOWN":
    case "RADIO": {
      if (typeof value !== "string") {
        return invalid(field, "a single selected option");
      }

      const allowed = parseOptions(field.options);

      if (!allowed.includes(value)) {
        return { value, error: `${field.label} has an invalid selected option` };
      }

      return { value };
    }

    case "CHECKBOX": {
      if (!Array.isArray(value)) {
        return invalid(field, "an array of selected options");
      }

      const allowed = parseOptions(field.options);

      for (const entry of value) {
        if (typeof entry !== "string" || !allowed.includes(entry)) {
          return { value, error: `${field.label} has an invalid selected option` };
        }
      }

      return { value };
    }

    default: {
      return invalid(field, "a supported field type");
    }
  }
}

function invalid(field: TemplateFieldDefinition, expected: string): FieldValueResult {
  return { value: null as unknown as Prisma.InputJsonValue, error: `${field.label} must be ${expected}` };
}

function isEmptyValue(value: SubmittedRequestValue["value"]): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim() === "";
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
}

function parseOptions(options: Prisma.JsonValue): string[] {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.filter((option): option is string => typeof option === "string");
}
