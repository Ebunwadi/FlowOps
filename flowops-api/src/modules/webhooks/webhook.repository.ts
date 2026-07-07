import { prisma } from "../../config/database";
import type { WebhookEventType } from "./webhook-events";
import { endpointSubscribesToEvent } from "./webhook-events";

const webhookEndpointSelect = {
  id: true,
  organisationId: true,
  name: true,
  url: true,
  events: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} as const;

const webhookDeliverySelect = {
  id: true,
  webhookEndpointId: true,
  eventType: true,
  payload: true,
  status: true,
  responseStatus: true,
  responseBody: true,
  attempts: true,
  nextAttemptAt: true,
  deliveredAt: true,
  createdAt: true,
} as const;

export async function createWebhookEndpointRecord(input: {
  organisationId: string;
  name: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  isActive?: boolean;
  createdById: string;
}) {
  return prisma.webhookEndpoint.create({
    data: {
      organisationId: input.organisationId,
      name: input.name,
      url: input.url,
      secret: input.secret,
      events: input.events,
      isActive: input.isActive ?? true,
      createdById: input.createdById,
    },
    select: webhookEndpointSelect,
  });
}

export async function findWebhookEndpointsByOrganisationId(organisationId: string) {
  return prisma.webhookEndpoint.findMany({
    where: { organisationId },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    select: webhookEndpointSelect,
  });
}

export async function findWebhookEndpointByIdInOrganisation(
  webhookEndpointId: string,
  organisationId: string,
) {
  return prisma.webhookEndpoint.findFirst({
    where: {
      id: webhookEndpointId,
      organisationId,
    },
    select: webhookEndpointSelect,
  });
}

export async function findActiveWebhookEndpointsByOrganisationId(
  organisationId: string,
) {
  return prisma.webhookEndpoint.findMany({
    where: {
      organisationId,
      isActive: true,
    },
    select: {
      id: true,
      organisationId: true,
      name: true,
      url: true,
      secret: true,
      events: true,
      isActive: true,
    },
  });
}

export async function findActiveWebhookEndpointsSubscribedToEvent(
  organisationId: string,
  eventType: WebhookEventType,
) {
  const endpoints = await findActiveWebhookEndpointsByOrganisationId(organisationId);

  return endpoints.filter((endpoint) =>
    endpointSubscribesToEvent(endpoint.events, eventType),
  );
}

export async function updateWebhookEndpointRecord(
  webhookEndpointId: string,
  organisationId: string,
  data: {
    name?: string;
    url?: string;
    events?: WebhookEventType[];
    isActive?: boolean;
  },
) {
  const result = await prisma.webhookEndpoint.updateMany({
    where: {
      id: webhookEndpointId,
      organisationId,
    },
    data,
  });

  if (result.count === 0) {
    return null;
  }

  return findWebhookEndpointByIdInOrganisation(webhookEndpointId, organisationId);
}

export async function deleteWebhookEndpointByIdInOrganisation(
  webhookEndpointId: string,
  organisationId: string,
) {
  return prisma.webhookEndpoint.deleteMany({
    where: {
      id: webhookEndpointId,
      organisationId,
    },
  });
}

export async function createWebhookDeliveryRecord(input: {
  webhookEndpointId: string;
  eventType: WebhookEventType;
  payload: unknown;
}) {
  return prisma.webhookDelivery.create({
    data: {
      webhookEndpointId: input.webhookEndpointId,
      eventType: input.eventType,
      payload: input.payload as object,
    },
    select: webhookDeliverySelect,
  });
}

export async function findWebhookDeliveriesByEndpointId(
  webhookEndpointId: string,
  limit: number,
) {
  return prisma.webhookDelivery.findMany({
    where: { webhookEndpointId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: webhookDeliverySelect,
  });
}

export async function findWebhookDeliveryById(deliveryId: string) {
  return prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    select: {
      ...webhookDeliverySelect,
      webhookEndpoint: {
        select: {
          id: true,
          organisationId: true,
          url: true,
          secret: true,
          isActive: true,
        },
      },
    },
  });
}

export async function findWebhookEndpointSecretById(webhookEndpointId: string) {
  return prisma.webhookEndpoint.findUnique({
    where: { id: webhookEndpointId },
    select: {
      id: true,
      secret: true,
      url: true,
      isActive: true,
    },
  });
}

export async function updateWebhookDeliveryAfterAttempt(input: {
  deliveryId: string;
  status: "PENDING" | "DELIVERED" | "FAILED";
  responseStatus?: number | null;
  responseBody?: string | null;
  attempts: number;
  nextAttemptAt?: Date | null;
  deliveredAt?: Date | null;
}) {
  return prisma.webhookDelivery.update({
    where: { id: input.deliveryId },
    data: {
      status: input.status,
      responseStatus: input.responseStatus ?? null,
      responseBody: input.responseBody ?? null,
      attempts: input.attempts,
      nextAttemptAt: input.nextAttemptAt ?? null,
      deliveredAt: input.deliveredAt ?? null,
    },
    select: webhookDeliverySelect,
  });
}
