import {
  WEBHOOK_SIGNATURE_HEADER,
  createWebhookSignature,
} from "../src/modules/webhooks/webhook.signature";
import { postWebhookDelivery } from "../src/modules/webhooks/webhook.http";

describe("postWebhookDelivery", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("posts JSON with the x-flowops-signature header", async () => {
    const payload = {
      id: "event-1",
      type: "workflow.request.submitted",
      data: { requestId: "request-1" },
    };
    const secret = "whsec_test_secret";

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "ok",
    });

    const result = await postWebhookDelivery(
      "https://example.com/webhooks/flowops",
      secret,
      payload,
    );

    expect(result.ok).toBe(true);
    expect(result.responseStatus).toBe(200);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const rawBody = options.body as string;

    expect(url).toBe("https://example.com/webhooks/flowops");
    expect(options.method).toBe("POST");
    expect(options.headers).toMatchObject({
      "Content-Type": "application/json",
      [WEBHOOK_SIGNATURE_HEADER]: createWebhookSignature(secret, rawBody),
    });
    expect(JSON.parse(rawBody)).toEqual(payload);
  });

  it("returns failure details for non-success responses", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "server error",
    });

    const result = await postWebhookDelivery(
      "https://example.com/webhooks/flowops",
      "whsec_test_secret",
      { hello: "world" },
    );

    expect(result.ok).toBe(false);
    expect(result.responseStatus).toBe(500);
    expect(result.responseBody).toBe("server error");
  });
});
