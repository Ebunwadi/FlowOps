import { apiClient } from "@/api/client";
import type { GeneratedWorkflowSuggestion } from "@/types/ai-workflow-suggestion";
import type { WorkflowRequestAiSummary } from "@/types/ai-request-summary";

export function generateWorkflowSuggestion(
  prompt: string,
): Promise<GeneratedWorkflowSuggestion> {
  return apiClient<GeneratedWorkflowSuggestion>("/ai/workflows/generate", {
    method: "POST",
    body: { prompt },
  });
}

export function generateWorkflowRequestSummary(
  workflowRequestId: string,
): Promise<WorkflowRequestAiSummary> {
  return apiClient<WorkflowRequestAiSummary>(
    `/workflow-requests/${workflowRequestId}/ai-summary`,
    {
      method: "POST",
    },
  );
}
