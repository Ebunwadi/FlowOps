export const WEBHOOK_EVENT_TYPES = [
  "workflow.request.submitted",
  "workflow.request.approved",
  "workflow.request.rejected",
  "workflow.request.completed",
  "workflow.comment.added",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export function isWebhookEventType(value: string): value is WebhookEventType {
  return WEBHOOK_EVENT_TYPES.includes(value as WebhookEventType);
}

export function parseWebhookEvents(value: unknown): WebhookEventType[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is WebhookEventType =>
      typeof item === "string" && isWebhookEventType(item),
  );
}

export function endpointSubscribesToEvent(
  events: unknown,
  eventType: WebhookEventType,
): boolean {
  return parseWebhookEvents(events).includes(eventType);
}
