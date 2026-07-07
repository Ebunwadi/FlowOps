import type { Prisma } from "../../generated/prisma/client";

type WebhookEndpointRecord = {
  id: string;
  organisationId: string;
  name: string;
  url: string;
  events: Prisma.JsonValue;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
};

type WebhookDeliveryRecord = {
  id: string;
  webhookEndpointId: string;
  eventType: string;
  payload: Prisma.JsonValue;
  status: "PENDING" | "DELIVERED" | "FAILED";
  responseStatus: number | null;
  responseBody: string | null;
  attempts: number;
  nextAttemptAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
};

export interface WebhookEndpointResponse {
  id: string;
  organisationId: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

export interface CreatedWebhookEndpointResponse extends WebhookEndpointResponse {
  secret: string;
}

export interface WebhookDeliveryResponse {
  id: string;
  webhookEndpointId: string;
  eventType: string;
  payload: unknown;
  status: "PENDING" | "DELIVERED" | "FAILED";
  responseStatus: number | null;
  responseBody: string | null;
  attempts: number;
  nextAttemptAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export function toWebhookEndpointResponse(
  record: WebhookEndpointRecord,
): WebhookEndpointResponse {
  return {
    id: record.id,
    organisationId: record.organisationId,
    name: record.name,
    url: record.url,
    events: Array.isArray(record.events)
      ? record.events.filter((item): item is string => typeof item === "string")
      : [],
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    createdBy: {
      id: record.createdBy.id,
      firstName: record.createdBy.firstName,
      lastName: record.createdBy.lastName,
      email: record.createdBy.email,
    },
  };
}

export function toCreatedWebhookEndpointResponse(
  record: WebhookEndpointRecord,
  secret: string,
): CreatedWebhookEndpointResponse {
  return {
    ...toWebhookEndpointResponse(record),
    secret,
  };
}

export function toWebhookDeliveryResponse(
  record: WebhookDeliveryRecord,
): WebhookDeliveryResponse {
  return {
    id: record.id,
    webhookEndpointId: record.webhookEndpointId,
    eventType: record.eventType,
    payload: record.payload,
    status: record.status,
    responseStatus: record.responseStatus,
    responseBody: record.responseBody,
    attempts: record.attempts,
    nextAttemptAt: record.nextAttemptAt?.toISOString() ?? null,
    deliveredAt: record.deliveredAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
  };
}
