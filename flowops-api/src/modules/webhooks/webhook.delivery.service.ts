import { randomUUID } from "node:crypto";

import { AuthorizationError } from "../../common/errors/httpErrors";
import { logger } from "../../config/logger";
import { enqueueDeliverWebhookJob } from "../../jobs/queues/webhook.queue";
import { DEFAULT_ORGANISATION_SETTINGS } from "../organisation-settings/organisation-settings.defaults";
import { findOrganisationSettingsByOrganisationId } from "../organisation-settings/organisation-settings.repository";
import { toWebhookDeliveryResponse, type WebhookDeliveryResponse } from "./webhook.mapper";
import {
  createWebhookDeliveryRecord,
  findActiveWebhookEndpointsSubscribedToEvent,
} from "./webhook.repository";
import type { WebhookEventType } from "./webhook-events";

export interface DispatchWebhookEventInput {
  organisationId: string;
  eventType: WebhookEventType;
  payload: Record<string, unknown>;
}

async function assertWebhooksEnabled(organisationId: string): Promise<void> {
  const settings = await findOrganisationSettingsByOrganisationId(organisationId);
  const allowWebhooks =
    settings?.allowWebhooks ?? DEFAULT_ORGANISATION_SETTINGS.allowWebhooks;

  if (!allowWebhooks) {
    throw new AuthorizationError("Webhooks are disabled for this organisation");
  }
}

export async function dispatchOrganisationWebhookEvent(
  input: DispatchWebhookEventInput,
): Promise<WebhookDeliveryResponse[]> {
  await assertWebhooksEnabled(input.organisationId);

  const endpoints = await findActiveWebhookEndpointsSubscribedToEvent(
    input.organisationId,
    input.eventType,
  );

  if (endpoints.length === 0) {
    return [];
  }

  const deliveries: WebhookDeliveryResponse[] = [];

  for (const endpoint of endpoints) {
    const delivery = await createWebhookDeliveryRecord({
      webhookEndpointId: endpoint.id,
      eventType: input.eventType,
      payload: {
        id: randomUUID(),
        type: input.eventType,
        createdAt: new Date().toISOString(),
        data: input.payload,
      },
    });

    await enqueueDeliverWebhookJob({ deliveryId: delivery.id });

    logger.info(
      {
        origin: "api",
        event: "webhook_delivery.queued",
        organisationId: input.organisationId,
        webhookEndpointId: endpoint.id,
        deliveryId: delivery.id,
        eventType: input.eventType,
      },
      `[API] Webhook delivery queued for "${endpoint.name}"`,
    );

    deliveries.push(toWebhookDeliveryResponse(delivery));
  }

  return deliveries;
}
