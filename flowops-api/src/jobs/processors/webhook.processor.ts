import { Worker, type Job } from "bullmq";

import { LogOrigin } from "../../common/logging/logFormat";
import { getRedisConnectionOptions } from "../../config/redis";
import { logger } from "../../config/logger";
import { executeWebhookDelivery } from "../../modules/webhooks/webhook.delivery.runner";
import { WEBHOOK_JOB_NAMES, WEBHOOK_QUEUE_NAME } from "../queues/queue-names";
import type { DeliverWebhookJobPayload } from "../queues/webhook.queue";

export async function processDeliverWebhookJob(
  job: Job<DeliverWebhookJobPayload>,
): Promise<void> {
  logger.info(
    {
      origin: LogOrigin.API,
      event: "queue.webhook.processing",
      jobId: job.id,
      jobName: job.name,
      deliveryId: job.data.deliveryId,
      attemptNumber: job.attemptsMade + 1,
    },
    `[Worker] Processing webhook delivery job "${job.name}"`,
  );

  await executeWebhookDelivery(job.data.deliveryId, job);
}

export function createWebhookWorker(): Worker<DeliverWebhookJobPayload> {
  return new Worker<DeliverWebhookJobPayload>(
    WEBHOOK_QUEUE_NAME,
    async (job) => {
      if (job.name === WEBHOOK_JOB_NAMES.DELIVER) {
        await processDeliverWebhookJob(job);
        return;
      }

      throw new Error(`Unknown webhook job: ${job.name}`);
    },
    {
      connection: getRedisConnectionOptions(),
    },
  );
}
