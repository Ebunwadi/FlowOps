import { WEBHOOK_SIGNATURE_HEADER, createWebhookSignature } from "./webhook.signature";

const WEBHOOK_REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BODY_LENGTH = 2_000;

export interface WebhookHttpDeliveryResult {
  ok: boolean;
  responseStatus: number | null;
  responseBody: string | null;
}

function truncateResponseBody(value: string): string {
  if (value.length <= MAX_RESPONSE_BODY_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_RESPONSE_BODY_LENGTH)}`;
}

export async function postWebhookDelivery(
  url: string,
  secret: string,
  payload: unknown,
): Promise<WebhookHttpDeliveryResult> {
  const rawBody = JSON.stringify(payload);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [WEBHOOK_SIGNATURE_HEADER]: createWebhookSignature(secret, rawBody),
      "User-Agent": "FlowOps-Webhooks/1.0",
    },
    body: rawBody,
    signal: AbortSignal.timeout(WEBHOOK_REQUEST_TIMEOUT_MS),
  });

  const responseText = await response.text();

  return {
    ok: response.ok,
    responseStatus: response.status,
    responseBody: responseText ? truncateResponseBody(responseText) : null,
  };
}
