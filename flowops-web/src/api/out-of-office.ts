import { apiClient } from "@/api/client";
import type {
  CreateOutOfOfficeRuleInput,
  OutOfOfficeRule,
  UpdateOutOfOfficeRuleInput,
} from "@/types/out-of-office";

export function listOutOfOfficeRules(): Promise<OutOfOfficeRule[]> {
  return apiClient<OutOfOfficeRule[]>("/out-of-office");
}

export function createOutOfOfficeRule(
  input: CreateOutOfOfficeRuleInput,
): Promise<OutOfOfficeRule> {
  return apiClient<OutOfOfficeRule>("/out-of-office", {
    method: "POST",
    body: input,
  });
}

export function updateOutOfOfficeRule(
  ruleId: string,
  input: UpdateOutOfOfficeRuleInput,
): Promise<OutOfOfficeRule> {
  return apiClient<OutOfOfficeRule>(`/out-of-office/${ruleId}`, {
    method: "PATCH",
    body: input,
  });
}
