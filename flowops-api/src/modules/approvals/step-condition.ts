import { z } from "zod";

export const STEP_CONDITION_OPERATORS = [
  "equals",
  "not_equals",
  "contains",
  "greater_than",
  "less_than",
] as const;

export type StepConditionOperator = (typeof STEP_CONDITION_OPERATORS)[number];

export interface StepCondition {
  fieldKey: string;
  operator: StepConditionOperator;
  value: unknown;
}

const stepConditionSchema = z.object({
  fieldKey: z.string().trim().min(1),
  operator: z.enum(STEP_CONDITION_OPERATORS),
  value: z.unknown(),
});

export function parseStepCondition(condition: unknown): StepCondition | null {
  if (condition === null || condition === undefined) {
    return null;
  }

  const parsed = stepConditionSchema.safeParse(condition);

  if (!parsed.success) {
    return null;
  }

  return {
    fieldKey: parsed.data.fieldKey,
    operator: parsed.data.operator,
    value: parsed.data.value,
  };
}

export function buildRequestValuesByFieldKey(
  fields: readonly { id: string; fieldKey: string }[],
  values: readonly { workflowFieldId: string; value: unknown }[],
): Record<string, unknown> {
  const fieldKeyById = new Map(fields.map((field) => [field.id, field.fieldKey]));
  const result: Record<string, unknown> = {};

  for (const entry of values) {
    const fieldKey = fieldKeyById.get(entry.workflowFieldId);

    if (fieldKey) {
      result[fieldKey] = entry.value;
    }
  }

  return result;
}

export function buildRequestValuesByFieldKeyFromStoredValues(
  values: readonly {
    value: unknown;
    workflowField: { fieldKey: string };
  }[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const entry of values) {
    result[entry.workflowField.fieldKey] = entry.value;
  }

  return result;
}

function isNumericValue(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function toComparableNumber(value: unknown): number | null {
  if (isNumericValue(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function valuesAreEqual(actual: unknown, expected: unknown): boolean {
  if (actual === expected) {
    return true;
  }

  const actualNumber = toComparableNumber(actual);
  const expectedNumber = toComparableNumber(expected);

  if (actualNumber !== null && expectedNumber !== null) {
    return actualNumber === expectedNumber;
  }

  return String(actual) === String(expected);
}

function evaluateContains(actual: unknown, expected: unknown): boolean {
  if (typeof actual === "string" && typeof expected === "string") {
    return actual.includes(expected);
  }

  if (Array.isArray(actual)) {
    return actual.some((entry) => valuesAreEqual(entry, expected));
  }

  return false;
}

export function evaluateStepCondition(
  condition: StepCondition,
  valuesByFieldKey: Record<string, unknown>,
): boolean {
  const actual = valuesByFieldKey[condition.fieldKey];

  switch (condition.operator) {
    case "equals":
      return valuesAreEqual(actual, condition.value);
    case "not_equals":
      return !valuesAreEqual(actual, condition.value);
    case "contains":
      return evaluateContains(actual, condition.value);
    case "greater_than": {
      const actualNumber = toComparableNumber(actual);
      const expectedNumber = toComparableNumber(condition.value);

      if (actualNumber === null || expectedNumber === null) {
        return false;
      }

      return actualNumber > expectedNumber;
    }
    case "less_than": {
      const actualNumber = toComparableNumber(actual);
      const expectedNumber = toComparableNumber(condition.value);

      if (actualNumber === null || expectedNumber === null) {
        return false;
      }

      return actualNumber < expectedNumber;
    }
    default:
      return false;
  }
}

export interface WorkflowStepWithCondition {
  id: string;
  stepOrder: number;
  condition?: unknown;
}

export function isWorkflowStepEligible(
  step: WorkflowStepWithCondition,
  valuesByFieldKey: Record<string, unknown>,
): boolean {
  const condition = parseStepCondition(step.condition);

  if (!condition) {
    return true;
  }

  return evaluateStepCondition(condition, valuesByFieldKey);
}

export function getFirstEligibleWorkflowStep<T extends WorkflowStepWithCondition>(
  steps: T[],
  valuesByFieldKey: Record<string, unknown>,
): T | null {
  const sortedSteps = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);

  return sortedSteps.find((step) => isWorkflowStepEligible(step, valuesByFieldKey)) ?? null;
}

export function getNextEligibleWorkflowStep<T extends WorkflowStepWithCondition>(
  steps: T[],
  currentStepId: string,
  valuesByFieldKey: Record<string, unknown>,
): T | null {
  const sortedSteps = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
  const currentIndex = sortedSteps.findIndex((step) => step.id === currentStepId);

  if (currentIndex === -1) {
    return null;
  }

  for (let index = currentIndex + 1; index < sortedSteps.length; index += 1) {
    const step = sortedSteps[index];

    if (isWorkflowStepEligible(step, valuesByFieldKey)) {
      return step;
    }
  }

  return null;
}
