import type { Job } from "bullmq";

import {
  WebhookDeliveryError,
  executeWebhookDelivery,
} from "../src/modules/webhooks/webhook.delivery.runner";
import * as webhookHttp from "../src/modules/webhooks/webhook.http";
import * as webhookRepository from "../src/modules/webhooks/webhook.repository";

jest.mock("../src/modules/webhooks/webhook.http");
jest.mock("../src/modules/webhooks/webhook.repository");

const deliveryId = "delivery-1";

function createJob(attemptsMade = 0, attempts = 5): Pick<Job, "attemptsMade" | "opts"> {
  return {
    attemptsMade,
    opts: { attempts },
  };
}

describe("executeWebhookDelivery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("delivers the webhook and marks the delivery as DELIVERED", async () => {
    jest.mocked(webhookRepository.findWebhookDeliveryById).mockResolvedValue({
      id: deliveryId,
      webhookEndpointId: "endpoint-1",
      eventType: "workflow.request.submitted",
      payload: { type: "workflow.request.submitted" },
      status: "PENDING",
      responseStatus: null,
      responseBody: null,
      attempts: 0,
      nextAttemptAt: null,
      deliveredAt: null,
      createdAt: new Date(),
      webhookEndpoint: {
        id: "endpoint-1",
        organisationId: "org-1",
        url: "https://example.com/hook",
        secret: "whsec_secret",
        isActive: true,
      },
    });

    jest.mocked(webhookHttp.postWebhookDelivery).mockResolvedValue({
      ok: true,
      responseStatus: 200,
      responseBody: "accepted",
    });

    await executeWebhookDelivery(deliveryId, createJob());

    expect(webhookRepository.updateWebhookDeliveryAfterAttempt).toHaveBeenCalledWith({
      deliveryId,
      status: "DELIVERED",
      attempts: 1,
      responseStatus: 200,
      responseBody: "accepted",
      nextAttemptAt: null,
      deliveredAt: expect.any(Date),
    });
  });

  it("throws on non-success responses so BullMQ can retry", async () => {
    jest.mocked(webhookRepository.findWebhookDeliveryById).mockResolvedValue({
      id: deliveryId,
      webhookEndpointId: "endpoint-1",
      eventType: "workflow.request.submitted",
      payload: { type: "workflow.request.submitted" },
      status: "PENDING",
      responseStatus: null,
      responseBody: null,
      attempts: 0,
      nextAttemptAt: null,
      deliveredAt: null,
      createdAt: new Date(),
      webhookEndpoint: {
        id: "endpoint-1",
        organisationId: "org-1",
        url: "https://example.com/hook",
        secret: "whsec_secret",
        isActive: true,
      },
    });

    jest.mocked(webhookHttp.postWebhookDelivery).mockResolvedValue({
      ok: false,
      responseStatus: 503,
      responseBody: "unavailable",
    });

    await expect(executeWebhookDelivery(deliveryId, createJob(0, 5))).rejects.toBeInstanceOf(
      WebhookDeliveryError,
    );

    expect(webhookRepository.updateWebhookDeliveryAfterAttempt).toHaveBeenCalledWith({
      deliveryId,
      status: "PENDING",
      attempts: 1,
      responseStatus: 503,
      responseBody: "unavailable",
      nextAttemptAt: expect.any(Date),
      deliveredAt: null,
    });
  });

  it("marks the delivery as FAILED on the final attempt", async () => {
    jest.mocked(webhookRepository.findWebhookDeliveryById).mockResolvedValue({
      id: deliveryId,
      webhookEndpointId: "endpoint-1",
      eventType: "workflow.request.submitted",
      payload: { type: "workflow.request.submitted" },
      status: "PENDING",
      responseStatus: null,
      responseBody: null,
      attempts: 4,
      nextAttemptAt: null,
      deliveredAt: null,
      createdAt: new Date(),
      webhookEndpoint: {
        id: "endpoint-1",
        organisationId: "org-1",
        url: "https://example.com/hook",
        secret: "whsec_secret",
        isActive: true,
      },
    });

    jest.mocked(webhookHttp.postWebhookDelivery).mockResolvedValue({
      ok: false,
      responseStatus: 500,
      responseBody: "error",
    });

    await expect(executeWebhookDelivery(deliveryId, createJob(4, 5))).rejects.toBeInstanceOf(
      WebhookDeliveryError,
    );

    expect(webhookRepository.updateWebhookDeliveryAfterAttempt).toHaveBeenCalledWith({
      deliveryId,
      status: "FAILED",
      attempts: 5,
      responseStatus: 500,
      responseBody: "error",
      nextAttemptAt: null,
      deliveredAt: null,
    });
  });

  it("skips inactive endpoints without retrying", async () => {
    jest.mocked(webhookRepository.findWebhookDeliveryById).mockResolvedValue({
      id: deliveryId,
      webhookEndpointId: "endpoint-1",
      eventType: "workflow.request.submitted",
      payload: { type: "workflow.request.submitted" },
      status: "PENDING",
      responseStatus: null,
      responseBody: null,
      attempts: 0,
      nextAttemptAt: null,
      deliveredAt: null,
      createdAt: new Date(),
      webhookEndpoint: {
        id: "endpoint-1",
        organisationId: "org-1",
        url: "https://example.com/hook",
        secret: "whsec_secret",
        isActive: false,
      },
    });

    await executeWebhookDelivery(deliveryId, createJob());

    expect(webhookHttp.postWebhookDelivery).not.toHaveBeenCalled();
    expect(webhookRepository.updateWebhookDeliveryAfterAttempt).toHaveBeenCalledWith({
      deliveryId,
      status: "FAILED",
      attempts: 1,
      responseStatus: null,
      responseBody: "Webhook endpoint is inactive",
      nextAttemptAt: null,
      deliveredAt: null,
    });
  });
});
