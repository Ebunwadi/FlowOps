import {
  createWebhookSignature,
  verifyWebhookSignature,
} from "../src/modules/webhooks/webhook.signature";

describe("webhook signature", () => {
  it("creates a deterministic HMAC SHA-256 signature", () => {
    const body = JSON.stringify({ type: "workflow.request.submitted" });
    const secret = "whsec_test_secret";

    const signature = createWebhookSignature(secret, body);

    expect(signature).toHaveLength(64);
    expect(createWebhookSignature(secret, body)).toBe(signature);
    expect(createWebhookSignature("other-secret", body)).not.toBe(signature);
  });

  it("verifies matching signatures", () => {
    const body = '{"hello":"world"}';
    const secret = "whsec_verify";

    const signature = createWebhookSignature(secret, body);

    expect(verifyWebhookSignature(secret, body, signature)).toBe(true);
    expect(verifyWebhookSignature(secret, body, "invalid")).toBe(false);
  });
});
