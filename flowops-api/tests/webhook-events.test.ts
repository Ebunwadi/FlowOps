import {
  endpointSubscribesToEvent,
  isWebhookEventType,
  parseWebhookEvents,
  WEBHOOK_EVENT_TYPES,
} from "../src/modules/webhooks/webhook-events";

describe("webhook events", () => {
  it("recognises supported event types", () => {
    for (const eventType of WEBHOOK_EVENT_TYPES) {
      expect(isWebhookEventType(eventType)).toBe(true);
    }

    expect(isWebhookEventType("workflow.request.unknown")).toBe(false);
  });

  it("parses valid subscribed events from JSON", () => {
    expect(
      parseWebhookEvents([
        "workflow.request.submitted",
        "invalid.event",
        "workflow.request.approved",
      ]),
    ).toEqual(["workflow.request.submitted", "workflow.request.approved"]);
  });

  it("checks endpoint subscription membership", () => {
    expect(
      endpointSubscribesToEvent(
        ["workflow.request.submitted", "workflow.request.approved"],
        "workflow.request.approved",
      ),
    ).toBe(true);

    expect(
      endpointSubscribesToEvent(["workflow.request.submitted"], "workflow.comment.added"),
    ).toBe(false);
  });
});
