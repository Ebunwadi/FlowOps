import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { generateWorkflowSuggestion } from "@/api/ai";
import { listOrganisationRoles } from "@/api/members";
import { getOrganisationSettings } from "@/api/organisation-settings";
import { useOrganisation } from "@/auth/use-organisation";
import { usePermissions } from "@/auth/use-permissions";
import { AuthLoadingScreen } from "@/components/auth/auth-loading-screen";
import { AiWorkflowSuggestionPreview } from "@/components/workflows/ai-workflow-suggestion-preview";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  hasUnresolvedApproverRoles,
  toWorkflowTemplateFormValuesFromAiSuggestion,
} from "@/lib/ai-workflow-to-form";
import { formatApiErrorMessage } from "@/lib/api-errors";
import type {
  CreateWorkflowFromAiLocationState,
  GeneratedWorkflowSuggestion,
} from "@/types/ai-workflow-suggestion";

const MIN_PROMPT_LENGTH = 10;

export function AiGenerateWorkflowPage() {
  const navigate = useNavigate();
  const { currentOrganisation } = useOrganisation();
  const { hasPermission, membershipAccessLoading } = usePermissions();
  const canCreate = hasPermission("workflows:create");

  const [prompt, setPrompt] = useState("");
  const [suggestion, setSuggestion] = useState<GeneratedWorkflowSuggestion | null>(
    null,
  );
  const [formError, setFormError] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ["organisation-settings", currentOrganisation?.id],
    queryFn: getOrganisationSettings,
    enabled: Boolean(currentOrganisation?.id) && canCreate,
  });

  const rolesQuery = useQuery({
    queryKey: ["organisations", currentOrganisation?.id, "roles"],
    queryFn: () => listOrganisationRoles(currentOrganisation!.id),
    enabled: Boolean(currentOrganisation?.id) && canCreate,
  });

  const generateMutation = useMutation({
    mutationFn: generateWorkflowSuggestion,
    onMutate: () => {
      setFormError(null);
    },
    onSuccess: (data) => {
      setSuggestion(data);
    },
    onError: (error) => {
      setFormError(formatApiErrorMessage(error));
    },
  });

  if (!currentOrganisation) {
    return <Navigate replace to="/organisation/setup" />;
  }

  if (membershipAccessLoading) {
    return <AuthLoadingScreen message="Checking your permissions..." />;
  }

  if (!canCreate) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">
            Generate workflow with AI
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You do not have permission to create workflow templates.
          </p>
        </div>
        <DismissibleAlert variant="warning">
          Contact an organisation admin if you need access to build workflows.
        </DismissibleAlert>
        <Button asChild type="button" variant="outline">
          <Link to="/workflows">Back to workflows</Link>
        </Button>
      </div>
    );
  }

  const aiEnabled = settingsQuery.data?.allowAiFeatures ?? true;
  const trimmedPrompt = prompt.trim();
  const promptTooShort =
    trimmedPrompt.length > 0 && trimmedPrompt.length < MIN_PROMPT_LENGTH;

  const handleGenerate = () => {
    if (trimmedPrompt.length < MIN_PROMPT_LENGTH) {
      setFormError(`Describe your workflow in at least ${MIN_PROMPT_LENGTH} characters.`);
      return;
    }

    generateMutation.mutate(trimmedPrompt);
  };

  const handleUseSuggestion = () => {
    if (!suggestion || !rolesQuery.data) {
      return;
    }

    const initialValues = toWorkflowTemplateFormValuesFromAiSuggestion(
      suggestion,
      rolesQuery.data,
    );

    const state: CreateWorkflowFromAiLocationState = {
      fromAi: true,
      initialValues,
      key: Date.now(),
    };

    navigate("/workflows/new", { state });
  };

  const unresolvedRoles =
    suggestion && rolesQuery.data
      ? hasUnresolvedApproverRoles(
          toWorkflowTemplateFormValuesFromAiSuggestion(suggestion, rolesQuery.data),
        )
      : false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link className="hover:text-foreground" to="/workflows">
              Workflows
            </Link>
            <span className="mx-2">/</span>
            <span>Generate with AI</span>
          </p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight">
            Generate workflow with AI
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Describe the process in plain English and review the suggested
            workflow before saving it.
          </p>
        </div>
        <Button asChild type="button" variant="outline">
          <Link to="/workflows">Back to list</Link>
        </Button>
      </div>

      {settingsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading organisation settingsù</p>
      ) : !aiEnabled ? (
        <DismissibleAlert variant="warning">
          AI features are disabled for this organisation. An admin can re-enable
          them under Settings ? Organisation settings.
        </DismissibleAlert>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Workflow description</CardTitle>
              <CardDescription>
                Example: ùEquipment request where staff submit the item needed,
                manager approves, then IT approves.ù
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formError ? (
                <DismissibleAlert variant="error">{formError}</DismissibleAlert>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="ai-workflow-prompt">Prompt</Label>
                <Textarea
                  disabled={generateMutation.isPending}
                  id="ai-workflow-prompt"
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Describe the workflow you want to create..."
                  rows={6}
                  value={prompt}
                />
                <p className="text-sm text-muted-foreground">
                  Minimum {MIN_PROMPT_LENGTH} characters.
                  {promptTooShort ? " Your prompt is too short." : null}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={
                    generateMutation.isPending || trimmedPrompt.length < MIN_PROMPT_LENGTH
                  }
                  onClick={handleGenerate}
                  type="button"
                >
                  {generateMutation.isPending
                    ? "Generatingù"
                    : suggestion
                      ? "Regenerate"
                      : "Generate"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {generateMutation.isPending ? (
            <p className="text-sm text-muted-foreground">
              Generating a workflow suggestionù
            </p>
          ) : null}

          {suggestion ? (
            <>
              <AiWorkflowSuggestionPreview
                roles={rolesQuery.data ?? []}
                suggestion={suggestion}
              />

              {unresolvedRoles ? (
                <DismissibleAlert variant="warning">
                  Some approval steps could not be mapped to organisation roles
                  automatically. You can assign approver roles on the next screen
                  before saving.
                </DismissibleAlert>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  disabled={generateMutation.isPending || rolesQuery.isLoading}
                  onClick={handleGenerate}
                  type="button"
                  variant="outline"
                >
                  Regenerate
                </Button>
                <Button
                  disabled={rolesQuery.isLoading}
                  onClick={handleUseSuggestion}
                  type="button"
                >
                  Use this workflow
                </Button>
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
