import { WEBHOOK_JOB_NAMES } from "../src/jobs/queues/queue-names";

const addMock = jest.fn();
const closeMock = jest.fn();

jest.mock("bullmq", () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: addMock,
    close: closeMock,
  })),
  Worker: jest.fn(),
}));

import {
  closeWebhookQueue,
  enqueueDeliverWebhookJob,
} from "../src/jobs/queues/webhook.queue";

describe("webhook queue", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await closeWebhookQueue();
  });

  it("enqueues deliver-webhook jobs with retry configuration", async () => {
    addMock.mockResolvedValue({ id: "job-1" });

    const payload = {
      deliveryId: "delivery-1",
    };

    const job = await enqueueDeliverWebhookJob(payload);

    expect(addMock).toHaveBeenCalledWith(WEBHOOK_JOB_NAMES.DELIVER, payload, {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    });
    expect(job).toEqual({ id: "job-1" });
  });
});
