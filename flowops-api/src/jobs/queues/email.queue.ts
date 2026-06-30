import { Queue } from "bullmq";

import { getRedisConnectionOptions } from "../../config/redis";
import { EMAIL_JOB_NAMES, EMAIL_QUEUE_NAME } from "./queue-names";

export interface SendEmailJobPayload {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

let emailQueue: Queue<SendEmailJobPayload> | null = null;

export function getEmailQueue(): Queue<SendEmailJobPayload> {
  if (!emailQueue) {
    emailQueue = new Queue<SendEmailJobPayload>(EMAIL_QUEUE_NAME, {
      connection: getRedisConnectionOptions(),
    });
  }

  return emailQueue;
}

export async function enqueueSendEmailJob(payload: SendEmailJobPayload) {
  return getEmailQueue().add(EMAIL_JOB_NAMES.SEND_EMAIL, payload, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  });
}

export async function closeEmailQueue(): Promise<void> {
  if (emailQueue) {
    await emailQueue.close();
    emailQueue = null;
  }
}
