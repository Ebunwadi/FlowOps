import type { GeneratedWorkflowSuggestion } from "./ai.validation";

export interface GenerateWorkflowSuggestionInput {
  prompt: string;
}

export interface GenerateRequestSummaryInput {
  context: string;
}

export interface AiProvider {
  generateWorkflowSuggestion(
    input: GenerateWorkflowSuggestionInput,
  ): Promise<GeneratedWorkflowSuggestion>;

  generateRequestSummary(input: GenerateRequestSummaryInput): Promise<string>;
}
