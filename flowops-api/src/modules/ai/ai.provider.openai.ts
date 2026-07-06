import { env } from "../../config/env";
import { AiGenerationError } from "./ai.errors";
import { REQUEST_SUMMARY_SYSTEM_PROMPT } from "./ai.request-summary.prompt";
import { WORKFLOW_GENERATION_SYSTEM_PROMPT } from "./ai.prompt";
import type { GeneratedWorkflowSuggestion } from "./ai.validation";
import { parseGeneratedWorkflowSuggestion, parseRequestSummary } from "./ai.validation";
import type {
  AiProvider,
  GenerateRequestSummaryInput,
  GenerateWorkflowSuggestionInput,
} from "./ai.provider.types";

interface OpenAiChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

function extractJsonPayload(content: string): unknown {
  const trimmed = content.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]) {
    return JSON.parse(fencedMatch[1]);
  }

  return JSON.parse(trimmed);
}

export class OpenAiProvider implements AiProvider {
  async generateWorkflowSuggestion(
    input: GenerateWorkflowSuggestionInput,
  ): Promise<GeneratedWorkflowSuggestion> {
    if (!env.aiApiKey) {
      throw new AiGenerationError("AI provider is not configured");
    }

    let response: Response;

    try {
      response = await fetch(`${env.aiBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.aiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: env.aiModel,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: WORKFLOW_GENERATION_SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: input.prompt,
            },
          ],
        }),
      });
    } catch {
      throw new AiGenerationError("Failed to contact AI provider");
    }

    if (!response.ok) {
      throw new AiGenerationError("AI provider returned an error response");
    }

    let payload: OpenAiChatCompletionResponse;

    try {
      payload = (await response.json()) as OpenAiChatCompletionResponse;
    } catch {
      throw new AiGenerationError("AI provider returned an invalid response");
    }

    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      throw new AiGenerationError("AI provider returned an empty response");
    }

    try {
      const parsed = extractJsonPayload(content);
      return parseGeneratedWorkflowSuggestion(parsed);
    } catch {
      throw new AiGenerationError("AI provider returned an invalid workflow suggestion");
    }
  }

  async generateRequestSummary(
    input: GenerateRequestSummaryInput,
  ): Promise<string> {
    if (!env.aiApiKey) {
      throw new AiGenerationError("AI provider is not configured");
    }

    let response: Response;

    try {
      response = await fetch(`${env.aiBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.aiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: env.aiModel,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: REQUEST_SUMMARY_SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: input.context,
            },
          ],
        }),
      });
    } catch {
      throw new AiGenerationError("Failed to contact AI provider");
    }

    if (!response.ok) {
      throw new AiGenerationError("AI provider returned an error response");
    }

    let payload: OpenAiChatCompletionResponse;

    try {
      payload = (await response.json()) as OpenAiChatCompletionResponse;
    } catch {
      throw new AiGenerationError("AI provider returned an invalid response");
    }

    const content = payload.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new AiGenerationError("AI provider returned an empty response");
    }

    try {
      return parseRequestSummary(content);
    } catch {
      throw new AiGenerationError("AI provider returned an invalid request summary");
    }
  }
}

export const openAiProvider = new OpenAiProvider();
