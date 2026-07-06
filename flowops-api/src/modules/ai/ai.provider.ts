import { env } from "../../config/env";
import { mockAiProvider } from "./ai.provider.mock";
import { openAiProvider } from "./ai.provider.openai";
import type { AiProvider } from "./ai.provider.types";

export function getAiProvider(): AiProvider {
  if (env.aiProvider === "openai") {
    return openAiProvider;
  }

  return mockAiProvider;
}

export function resetAiProviderForTests(): void {
  // Reserved for future provider registry overrides in tests.
}
