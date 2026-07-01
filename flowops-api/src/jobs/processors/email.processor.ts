import { Worker, type Job } from "bullmq";

import { LogOrigin } from "../../common/logging/logFormat";
import { getRedisConnectionOptions } from "../../config/redis";
import { logger } from "../../config/logger";
import { sendTemplatedEmail } from "../../modules/email/email.service";
import {
  EMAIL_JOB_NAMES,
  EMAIL_QUEUE_NAME,
} from "../queues/queue-names";
import type { SendEmailJobPayload } from "../queues/email.queue";

export async function processSendEmailJob(
  job: Job<SendEmailJobPayload>,
): Promise<void> {
  logger.info(
    {
      origin: LogOrigin.API,
      event: "queue.email.processing",
      jobId: job.id,
      jobName: job.name,
      to: job.data.to,
      template: job.data.template,
    },
    `[Worker] Processing email job "${job.name}" for ${job.data.to}`,
  );

  await sendTemplatedEmail({
    to: job.data.to,
    template: job.data.template,
    data: job.data.data,
    subject: job.data.subject,
  });

  logger.info(
    {
      origin: LogOrigin.API,
      event: "queue.email.delivered",
      jobId: job.id,
      jobName: job.name,
      to: job.data.to,
      template: job.data.template,
    },
    `[Worker] Email job "${job.name}" delivered to ${job.data.to}`,
  );
}

export function createEmailWorker(): Worker<SendEmailJobPayload> {
  return new Worker<SendEmailJobPayload>(
    EMAIL_QUEUE_NAME,
    async (job) => {
      if (job.name === EMAIL_JOB_NAMES.SEND_EMAIL) {
        await processSendEmailJob(job);
        return;
      }

      throw new Error(`Unknown email job: ${job.name}`);
    },
    {
      connection: getRedisConnectionOptions(),
    },
  );
}
