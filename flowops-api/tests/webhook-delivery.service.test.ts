import { AuthorizationError } from "../src/common/errors/httpErrors";
import * as webhookQueue from "../src/jobs/queues/webhook.queue";
import { dispatchOrganisationWebhookEvent } from "../src/modules/webhooks/webhook.delivery.service";
import * as organisationSettingsRepository from "../src/modules/organisation-settings/organisation-settings.repository";
import * as webhookRepository from "../src/modules/webhooks/webhook.repository";

jest.mock("../src/jobs/queues/webhook.queue");
jest.mock("../src/modules/organisation-settings/organisation-settings.repository");
jest.mock("../src/modules/webhooks/webhook.repository");

const organisationId = "550e8400-e29b-41d4-a716-446655440000";

describe("dispatchOrganisationWebhookEvent", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest
      .mocked(organisationSettingsRepository.findOrganisationSettingsByOrganisationId)
      .mockResolvedValue({
        id: "settings-1",
        organisationId,
        allowAiFeatures: true,
        allowWebhooks: true,
        allowApiKeys: true,
        defaultSlaHours: null,
        requireCommentsOnReject: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
  });

  it("creates delivery records and enqueues jobs for subscribed endpoints", async () => {
    jest
      .mocked(webhookRepository.findActiveWebhookEndpointsSubscribedToEvent)
      .mockResolvedValue([
        {
          id: "endpoint-1",
          organisationId,
          name: "Primary webhook",
          url: "https://example.com/hook",
          secret: "whsec_secret",
          events: ["workflow.request.submitted"],
          isActive: true,
        },
      ]);

    jest.mocked(webhookRepository.createWebhookDeliveryRecord).mockResolvedValue({
      id: "delivery-1",
      webhookEndpointId: "endpoint-1",
      eventType: "workflow.request.submitted",
      payload: { type: "workflow.request.submitted" },
      status: "PENDING",
      responseStatus: null,
      responseBody: null,
      attempts: 0,
      nextAttemptAt: null,
      deliveredAt: null,
      createdAt: new Date("2026-07-07T12:00:00.000Z"),
    });

    const deliveries = await dispatchOrganisationWebhookEvent({
      organisationId,
      eventType: "workflow.request.submitted",
      payload: {
        requestId: "request-1",
      },
    });

    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]?.status).toBe("PENDING");
    expect(webhookRepository.createWebhookDeliveryRecord).toHaveBeenCalledTimes(1);
    expect(webhookQueue.enqueueDeliverWebhookJob).toHaveBeenCalledWith({
      deliveryId: "delivery-1",
    });
  });

  it("returns an empty list when no endpoints subscribe to the event", async () => {
    jest
      .mocked(webhookRepository.findActiveWebhookEndpointsSubscribedToEvent)
      .mockResolvedValue([]);

    const deliveries = await dispatchOrganisationWebhookEvent({
      organisationId,
      eventType: "workflow.request.approved",
      payload: {
        requestId: "request-1",
      },
    });

    expect(deliveries).toEqual([]);
    expect(webhookRepository.createWebhookDeliveryRecord).not.toHaveBeenCalled();
    expect(webhookQueue.enqueueDeliverWebhookJob).not.toHaveBeenCalled();
  });

  it("throws when webhooks are disabled for the organisation", async () => {
    jest
      .mocked(organisationSettingsRepository.findOrganisationSettingsByOrganisationId)
      .mockResolvedValue({
        id: "settings-1",
        organisationId,
        allowAiFeatures: true,
        allowWebhooks: false,
        allowApiKeys: true,
        defaultSlaHours: null,
        requireCommentsOnReject: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    await expect(
      dispatchOrganisationWebhookEvent({
        organisationId,
        eventType: "workflow.request.submitted",
        payload: { requestId: "request-1" },
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});
