import { LogOrigin } from "../../common/logging/logFormat";
import { logger } from "../../config/logger";
import { closeEmailQueue } from "../queues/email.queue";
import { closeNotificationQueue } from "../queues/notification.queue";
import { createEmailWorker } from "../processors/email.processor";
import { createNotificationWorker } from "../processors/notification.processor";

const workers = [createEmailWorker(), createNotificationWorker()];

for (const worker of workers) {
  worker.on("completed", (job) => {
    logger.info(
      {
        origin: LogOrigin.API,
        event: "queue.job.completed",
        queueName: worker.name,
        jobId: job.id,
        jobName: job.name,
      },
      `[Worker] Job "${job.name}" completed on queue "${worker.name}"`,
    );
  });

  worker.on("failed", (job, error) => {
    logger.error(
      {
        origin: LogOrigin.API,
        event: "queue.job.failed",
        queueName: worker.name,
        jobId: job?.id ?? null,
        jobName: job?.name ?? null,
        error,
      },
      `[Worker] Job "${job?.name ?? "unknown"}" failed on queue "${worker.name}"`,
    );
  });
}

logger.info(
  {
    origin: LogOrigin.API,
    event: "worker.started",
    queues: workers.map((worker) => worker.name),
  },
  `[Worker] FlowOps job worker started (${workers.length} queues)`,
);

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info(
    { origin: LogOrigin.API, event: "worker.shutdown", signal },
    `[Worker] Shutdown signal received (${signal})`,
  );

  await Promise.all(workers.map(async (worker) => worker.close()));
  await Promise.all([closeEmailQueue(), closeNotificationQueue()]);

  logger.info(
    { origin: LogOrigin.API, event: "worker.stopped" },
    "[Worker] Job worker stopped",
  );

  process.exit(0);
}

process.on("SIGINT", (signal) => {
  void shutdown(signal);
});

process.on("SIGTERM", (signal) => {
  void shutdown(signal);
});
