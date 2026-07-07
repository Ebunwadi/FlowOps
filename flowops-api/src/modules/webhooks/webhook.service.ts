import {
  AuthorizationError,
  NotFoundError,
} from "../../common/errors/httpErrors";
import { logger } from "../../config/logger";
import { DEFAULT_ORGANISATION_SETTINGS } from "../organisation-settings/organisation-settings.defaults";
import { findOrganisationSettingsByOrganisationId } from "../organisation-settings/organisation-settings.repository";
import { generateWebhookSecret } from "./webhook.crypto";
import {
  toCreatedWebhookEndpointResponse,
  toWebhookDeliveryResponse,
  toWebhookEndpointResponse,
  type CreatedWebhookEndpointResponse,
  type WebhookDeliveryResponse,
  type WebhookEndpointResponse,
} from "./webhook.mapper";
import {
  createWebhookEndpointRecord,
  deleteWebhookEndpointByIdInOrganisation,
  findWebhookDeliveriesByEndpointId,
  findWebhookEndpointByIdInOrganisation,
  findWebhookEndpointsByOrganisationId,
  updateWebhookEndpointRecord,
} from "./webhook.repository";
import type {
  CreateWebhookEndpointBody,
  UpdateWebhookEndpointBody,
} from "./webhook.validation";

async function assertWebhooksEnabled(organisationId: string): Promise<void> {
  const settings = await findOrganisationSettingsByOrganisationId(organisationId);
  const allowWebhooks =
    settings?.allowWebhooks ?? DEFAULT_ORGANISATION_SETTINGS.allowWebhooks;

  if (!allowWebhooks) {
    throw new AuthorizationError("Webhooks are disabled for this organisation");
  }
}

export async function createWebhookEndpoint(
  organisationId: string,
  createdById: string,
  input: CreateWebhookEndpointBody,
): Promise<CreatedWebhookEndpointResponse> {
  await assertWebhooksEnabled(organisationId);

  const secret = generateWebhookSecret();
  const record = await createWebhookEndpointRecord({
    organisationId,
    name: input.name,
    url: input.url,
    secret,
    events: input.events,
    isActive: input.isActive,
    createdById,
  });

  logger.info(
    {
      origin: "api",
      event: "webhook_endpoint.created",
      organisationId,
      webhookEndpointId: record.id,
      createdById,
      eventCount: input.events.length,
    },
    `[API] Webhook endpoint "${record.name}" created`,
  );

  return toCreatedWebhookEndpointResponse(record, secret);
}

export async function listWebhookEndpoints(
  organisationId: string,
): Promise<WebhookEndpointResponse[]> {
  await assertWebhooksEnabled(organisationId);

  const records = await findWebhookEndpointsByOrganisationId(organisationId);
  return records.map(toWebhookEndpointResponse);
}

export async function getWebhookEndpoint(
  organisationId: string,
  webhookEndpointId: string,
): Promise<WebhookEndpointResponse> {
  await assertWebhooksEnabled(organisationId);

  const record = await findWebhookEndpointByIdInOrganisation(
    webhookEndpointId,
    organisationId,
  );

  if (!record) {
    throw new NotFoundError("Webhook endpoint not found");
  }

  return toWebhookEndpointResponse(record);
}

export async function updateWebhookEndpoint(
  organisationId: string,
  webhookEndpointId: string,
  input: UpdateWebhookEndpointBody,
): Promise<WebhookEndpointResponse> {
  await assertWebhooksEnabled(organisationId);

  const updated = await updateWebhookEndpointRecord(
    webhookEndpointId,
    organisationId,
    input,
  );

  if (!updated) {
    throw new NotFoundError("Webhook endpoint not found");
  }

  logger.info(
    {
      origin: "api",
      event: "webhook_endpoint.updated",
      organisationId,
      webhookEndpointId,
    },
    `[API] Webhook endpoint "${updated.name}" updated`,
  );

  return toWebhookEndpointResponse(updated);
}

export async function deleteWebhookEndpoint(
  organisationId: string,
  webhookEndpointId: string,
): Promise<void> {
  await assertWebhooksEnabled(organisationId);

  const result = await deleteWebhookEndpointByIdInOrganisation(
    webhookEndpointId,
    organisationId,
  );

  if (result.count === 0) {
    throw new NotFoundError("Webhook endpoint not found");
  }

  logger.info(
    {
      origin: "api",
      event: "webhook_endpoint.deleted",
      organisationId,
      webhookEndpointId,
    },
    `[API] Webhook endpoint deleted`,
  );
}

export async function listWebhookDeliveries(
  organisationId: string,
  webhookEndpointId: string,
  limit = 20,
): Promise<WebhookDeliveryResponse[]> {
  await assertWebhooksEnabled(organisationId);

  const endpoint = await findWebhookEndpointByIdInOrganisation(
    webhookEndpointId,
    organisationId,
  );

  if (!endpoint) {
    throw new NotFoundError("Webhook endpoint not found");
  }

  const deliveries = await findWebhookDeliveriesByEndpointId(
    webhookEndpointId,
    limit,
  );

  return deliveries.map(toWebhookDeliveryResponse);
}
