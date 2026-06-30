import { EMAIL_JOB_NAMES } from "../src/jobs/queues/queue-names";

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
  closeEmailQueue,
  enqueueSendEmailJob,
} from "../src/jobs/queues/email.queue";

describe("email queue", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await closeEmailQueue();
  });

  it("enqueues send-email jobs with retry configuration", async () => {
    addMock.mockResolvedValue({ id: "job-1" });

    const payload = {
      to: "approver@example.com",
      subject: "Approval required",
      template: "APPROVAL_REQUIRED",
      data: {
        requestTitle: "New laptop request",
      },
    };

    const job = await enqueueSendEmailJob(payload);

    expect(addMock).toHaveBeenCalledWith(EMAIL_JOB_NAMES.SEND_EMAIL, payload, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    });
    expect(job).toEqual({ id: "job-1" });
  });
});
