import { Worker, type Job } from "bullmq";

import { LogOrigin } from "../../common/logging/logFormat";
import { getRedisConnectionOptions } from "../../config/redis";
import { logger } from "../../config/logger";
import {
  NOTIFICATION_JOB_NAMES,
  NOTIFICATION_QUEUE_NAME,
} from "../queues/queue-names";
import type { DeliverNotificationJobPayload } from "../queues/notification.queue";

export async function processDeliverNotificationJob(
  job: Job<DeliverNotificationJobPayload>,
): Promise<void> {
  logger.info(
    {
      origin: LogOrigin.API,
      event: "queue.notification.processing",
      jobId: job.id,
      jobName: job.name,
      notificationId: job.data.notificationId,
      recipientId: job.data.recipientId,
    },
    `[Worker] Processing notification delivery job "${job.name}"`,
  );

  // Reserved for async notification side-effects beyond in-app persistence.
}

export function createNotificationWorker(): Worker<DeliverNotificationJobPayload> {
  return new Worker<DeliverNotificationJobPayload>(
    NOTIFICATION_QUEUE_NAME,
    async (job) => {
      if (job.name === NOTIFICATION_JOB_NAMES.DELIVER) {
        await processDeliverNotificationJob(job);
        return;
      }

      throw new Error(`Unknown notification job: ${job.name}`);
    },
    {
      connection: getRedisConnectionOptions(),
    },
  );
}
