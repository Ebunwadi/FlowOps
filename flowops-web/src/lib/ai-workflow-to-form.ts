import type { CreateWorkflowTemplateFormValues } from "@/schemas/workflow-template.schema";
import type { GeneratedWorkflowSuggestion } from "@/types/ai-workflow-suggestion";
import type { OrganisationRole } from "@/types/member";

const ROLE_ALIASES: Record<string, readonly string[]> = {
  manager: ["Manager"],
  admin: ["Admin"],
  it: ["Admin", "Manager"],
  finance: ["Admin", "Manager"],
  approver: ["Approver", "Manager"],
  owner: ["Owner"],
  staff: ["Staff"],
};

function normalizeRoleName(value: string): string {
  return value.trim().toLowerCase();
}

export function resolveApproverRoleId(
  suggestedRole: string | undefined,
  roles: OrganisationRole[],
): string {
  if (!suggestedRole || roles.length === 0) {
    return "";
  }

  const normalizedSuggestion = normalizeRoleName(suggestedRole);
  const exactMatch = roles.find(
    (role) => normalizeRoleName(role.name) === normalizedSuggestion,
  );

  if (exactMatch) {
    return exactMatch.id;
  }

  const partialMatch = roles.find((role) => {
    const normalizedRoleName = normalizeRoleName(role.name);
    return (
      normalizedRoleName.includes(normalizedSuggestion) ||
      normalizedSuggestion.includes(normalizedRoleName)
    );
  });

  if (partialMatch) {
    return partialMatch.id;
  }

  for (const [alias, roleNames] of Object.entries(ROLE_ALIASES)) {
    if (!normalizedSuggestion.includes(alias)) {
      continue;
    }

    for (const roleName of roleNames) {
      const matchedRole = roles.find((role) => role.name === roleName);
      if (matchedRole) {
        return matchedRole.id;
      }
    }
  }

  return "";
}

export function toWorkflowTemplateFormValuesFromAiSuggestion(
  suggestion: GeneratedWorkflowSuggestion,
  roles: OrganisationRole[],
): CreateWorkflowTemplateFormValues {
  return {
    name: suggestion.name,
    description: suggestion.description ?? "",
    category: suggestion.category ?? "",
    fields: [...suggestion.fields]
      .sort((left, right) => left.fieldOrder - right.fieldOrder)
      .map((field) => ({
        label: field.label,
        fieldKey: field.fieldKey,
        fieldType: field.fieldType,
        helpText: field.helpText ?? "",
        placeholder: field.placeholder ?? "",
        isRequired: field.isRequired,
        options: field.options ?? [],
        fieldOrder: field.fieldOrder,
      })),
    steps: [...suggestion.steps]
      .sort((left, right) => left.stepOrder - right.stepOrder)
      .map((step) => ({
        name: step.name,
        description: step.description ?? "",
        stepOrder: step.stepOrder,
        approverRoleId: resolveApproverRoleId(step.suggestedApproverRole, roles),
        slaHours: "" as const,
        allowDelegation: false,
      })),
  };
}

export function hasUnresolvedApproverRoles(
  values: CreateWorkflowTemplateFormValues,
): boolean {
  return values.steps.some((step) => step.approverRoleId.trim() === "");
}
