import { FIELD_TYPE_LABELS } from "@/schemas/workflow-template.schema";
import type { GeneratedWorkflowSuggestion } from "@/types/ai-workflow-suggestion";
import type { OrganisationRole } from "@/types/member";

import { resolveApproverRoleId } from "@/lib/ai-workflow-to-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AiWorkflowSuggestionPreviewProps {
  roles: OrganisationRole[];
  suggestion: GeneratedWorkflowSuggestion;
}

export function AiWorkflowSuggestionPreview({
  roles,
  suggestion,
}: AiWorkflowSuggestionPreviewProps) {
  const sortedFields = [...suggestion.fields].sort(
    (left, right) => left.fieldOrder - right.fieldOrder,
  );
  const sortedSteps = [...suggestion.steps].sort(
    (left, right) => left.stepOrder - right.stepOrder,
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{suggestion.name}</CardTitle>
          <CardDescription>
            {suggestion.description || "No description provided."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {suggestion.category ? (
            <p>
              <span className="font-medium text-foreground">Category:</span>{" "}
              {suggestion.category}
            </p>
          ) : null}
          <p>
            Review this draft carefully. FlowOps does not publish AI suggestions
            automatically ù you assign approver roles and save the workflow
            yourself.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Suggested fields</CardTitle>
          <CardDescription>
            {sortedFields.length} form field
            {sortedFields.length === 1 ? "" : "s"} proposed by AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedFields.map((field) => (
            <div
              key={`${field.fieldOrder}-${field.fieldKey}`}
              className="rounded-lg border border-border p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground">{field.label}</p>
                <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {FIELD_TYPE_LABELS[field.fieldType]}
                </span>
                {field.isRequired ? (
                  <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    Required
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Key: {field.fieldKey}
              </p>
              {field.options && field.options.length > 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Options: {field.options.join(", ")}
                </p>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Suggested approval steps</CardTitle>
          <CardDescription>
            Approver roles are suggested only ù you confirm them on the create
            workflow form.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedSteps.map((step) => {
            const matchedRoleId = resolveApproverRoleId(
              step.suggestedApproverRole,
              roles,
            );
            const matchedRole = roles.find((role) => role.id === matchedRoleId);

            return (
              <div
                key={`${step.stepOrder}-${step.name}`}
                className="rounded-lg border border-border p-4"
              >
                <p className="font-medium text-foreground">
                  {step.stepOrder}. {step.name}
                </p>
                {step.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-muted-foreground">
                  Suggested approver:{" "}
                  {step.suggestedApproverRole ?? "Not specified"}
                  {matchedRole
                    ? ` ? mapped to ${matchedRole.name}`
                    : " ? choose a role manually"}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
