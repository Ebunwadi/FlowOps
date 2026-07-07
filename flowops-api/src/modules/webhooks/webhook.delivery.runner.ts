import type { Job } from "bullmq";

import { LogOrigin } from "../../common/logging/logFormat";
import { logger } from "../../config/logger";
import { postWebhookDelivery } from "./webhook.http";
import { findWebhookDeliveryById, updateWebhookDeliveryAfterAttempt } from "./webhook.repository";

export class WebhookDeliveryError extends Error {
  constructor(
    message: string,
    readonly responseStatus: number | null = null,
    readonly responseBody: string | null = null,
  ) {
    super(message);
    this.name = "WebhookDeliveryError";
  }
}

function getMaxAttempts(job: Pick<Job, "attemptsMade" | "opts">): number {
  return job.opts.attempts ?? 1;
}

function getCurrentAttempt(job: Pick<Job, "attemptsMade">): number {
  return job.attemptsMade + 1;
}

export async function executeWebhookDelivery(
  deliveryId: string,
  job: Pick<Job, "attemptsMade" | "opts">,
): Promise<void> {
  const delivery = await findWebhookDeliveryById(deliveryId);

  if (!delivery) {
    throw new Error(`Webhook delivery not found: ${deliveryId}`);
  }

  if (delivery.status === "DELIVERED") {
    return;
  }

  const endpoint = delivery.webhookEndpoint;
  const attemptNumber = getCurrentAttempt(job);
  const maxAttempts = getMaxAttempts(job);

  if (!endpoint.isActive) {
    await updateWebhookDeliveryAfterAttempt({
      deliveryId,
      status: "FAILED",
      attempts: attemptNumber,
      responseStatus: null,
      responseBody: "Webhook endpoint is inactive",
      nextAttemptAt: null,
      deliveredAt: null,
    });

    logger.warn(
      {
        origin: LogOrigin.API,
        event: "webhook_delivery.skipped_inactive_endpoint",
        deliveryId,
        webhookEndpointId: endpoint.id,
      },
      "[Worker] Skipped webhook delivery because endpoint is inactive",
    );

    return;
  }

  let result;

  try {
    result = await postWebhookDelivery(endpoint.url, endpoint.secret, delivery.payload);
  } catch (error) {
    const responseBody =
      error instanceof Error ? error.message : "Webhook delivery request failed";

    await updateWebhookDeliveryAfterAttempt({
      deliveryId,
      status: attemptNumber >= maxAttempts ? "FAILED" : "PENDING",
      attempts: attemptNumber,
      responseStatus: null,
      responseBody,
      nextAttemptAt: attemptNumber >= maxAttempts ? null : new Date(),
      deliveredAt: null,
    });

    logger.error(
      {
        origin: LogOrigin.API,
        event: "webhook_delivery.request_failed",
        deliveryId,
        webhookEndpointId: endpoint.id,
        attemptNumber,
        maxAttempts,
        error,
      },
      "[Worker] Webhook delivery request failed",
    );

    throw new WebhookDeliveryError(responseBody);
  }

  if (result.ok) {
    await updateWebhookDeliveryAfterAttempt({
      deliveryId,
      status: "DELIVERED",
      attempts: attemptNumber,
      responseStatus: result.responseStatus,
      responseBody: result.responseBody,
      nextAttemptAt: null,
      deliveredAt: new Date(),
    });

    logger.info(
      {
        origin: LogOrigin.API,
        event: "webhook_delivery.delivered",
        deliveryId,
        webhookEndpointId: endpoint.id,
        responseStatus: result.responseStatus,
        attemptNumber,
      },
      "[Worker] Webhook delivery completed successfully",
    );

    return;
  }

  const isFinalAttempt = attemptNumber >= maxAttempts;

  await updateWebhookDeliveryAfterAttempt({
    deliveryId,
    status: isFinalAttempt ? "FAILED" : "PENDING",
    attempts: attemptNumber,
    responseStatus: result.responseStatus,
    responseBody: result.responseBody,
    nextAttemptAt: isFinalAttempt ? null : new Date(),
    deliveredAt: null,
  });

  logger.warn(
    {
      origin: LogOrigin.API,
      event: "webhook_delivery.http_error",
      deliveryId,
      webhookEndpointId: endpoint.id,
      responseStatus: result.responseStatus,
      attemptNumber,
      maxAttempts,
    },
    "[Worker] Webhook delivery returned a non-success response",
  );

  throw new WebhookDeliveryError(
    `Webhook endpoint returned HTTP ${result.responseStatus ?? "error"}`,
    result.responseStatus,
    result.responseBody,
  );
}
