import { apiClient } from "@/api/client";
import type { ApiKeySummary, CreateApiKeyInput, CreatedApiKey } from "@/types/api-key";

export function listApiKeys(): Promise<ApiKeySummary[]> {
  return apiClient<ApiKeySummary[]>("/api-keys");
}

export function createApiKey(input: CreateApiKeyInput): Promise<CreatedApiKey> {
  return apiClient<CreatedApiKey>("/api-keys", {
    method: "POST",
    body: input,
  });
}

export function revokeApiKey(apiKeyId: string): Promise<ApiKeySummary> {
  return apiClient<ApiKeySummary>(`/api-keys/${apiKeyId}`, {
    method: "DELETE",
  });
}
