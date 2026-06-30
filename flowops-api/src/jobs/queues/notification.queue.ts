import { Queue } from "bullmq";

import { getRedisConnectionOptions } from "../../config/redis";
import { NOTIFICATION_JOB_NAMES, NOTIFICATION_QUEUE_NAME } from "./queue-names";

export interface DeliverNotificationJobPayload {
  notificationId: string;
  recipientId: string;
}

let notificationQueue: Queue<DeliverNotificationJobPayload> | null = null;

export function getNotificationQueue(): Queue<DeliverNotificationJobPayload> {
  if (!notificationQueue) {
    notificationQueue = new Queue<DeliverNotificationJobPayload>(
      NOTIFICATION_QUEUE_NAME,
      {
        connection: getRedisConnectionOptions(),
      },
    );
  }

  return notificationQueue;
}

export async function enqueueDeliverNotificationJob(
  payload: DeliverNotificationJobPayload,
) {
  return getNotificationQueue().add(NOTIFICATION_JOB_NAMES.DELIVER, payload, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  });
}

export async function closeNotificationQueue(): Promise<void> {
  if (notificationQueue) {
    await notificationQueue.close();
    notificationQueue = null;
  }
}
