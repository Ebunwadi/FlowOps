import { apiClient } from "@/api/client";
import type {
  CreateWebhookEndpointInput,
  CreatedWebhookEndpoint,
  UpdateWebhookEndpointInput,
  WebhookDeliverySummary,
  WebhookEndpointSummary,
} from "@/types/webhook";

export function listWebhookEndpoints(): Promise<WebhookEndpointSummary[]> {
  return apiClient<WebhookEndpointSummary[]>("/webhooks");
}

export function createWebhookEndpoint(
  input: CreateWebhookEndpointInput,
): Promise<CreatedWebhookEndpoint> {
  return apiClient<CreatedWebhookEndpoint>("/webhooks", {
    method: "POST",
    body: input,
  });
}

export function updateWebhookEndpoint(
  webhookId: string,
  input: UpdateWebhookEndpointInput,
): Promise<WebhookEndpointSummary> {
  return apiClient<WebhookEndpointSummary>(`/webhooks/${webhookId}`, {
    method: "PATCH",
    body: input,
  });
}

export function deleteWebhookEndpoint(webhookId: string): Promise<null> {
  return apiClient<null>(`/webhooks/${webhookId}`, {
    method: "DELETE",
  });
}

export function listWebhookDeliveries(
  webhookId: string,
  limit = 20,
): Promise<WebhookDeliverySummary[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  return apiClient<WebhookDeliverySummary[]>(
    `/webhooks/${webhookId}/deliveries?${params.toString()}`,
  );
}
