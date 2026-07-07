import { Queue } from "bullmq";

import { getRedisConnectionOptions } from "../../config/redis";
import { WEBHOOK_JOB_NAMES, WEBHOOK_QUEUE_NAME } from "./queue-names";

export interface DeliverWebhookJobPayload {
  deliveryId: string;
}

let webhookQueue: Queue<DeliverWebhookJobPayload> | null = null;

export function getWebhookQueue(): Queue<DeliverWebhookJobPayload> {
  if (!webhookQueue) {
    webhookQueue = new Queue<DeliverWebhookJobPayload>(WEBHOOK_QUEUE_NAME, {
      connection: getRedisConnectionOptions(),
    });
  }

  return webhookQueue;
}

export async function enqueueDeliverWebhookJob(payload: DeliverWebhookJobPayload) {
  return getWebhookQueue().add(WEBHOOK_JOB_NAMES.DELIVER, payload, {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  });
}

export async function closeWebhookQueue(): Promise<void> {
  if (webhookQueue) {
    await webhookQueue.close();
    webhookQueue = null;
  }
}
