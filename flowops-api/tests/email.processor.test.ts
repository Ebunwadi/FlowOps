import type { Job } from "bullmq";

import { processSendEmailJob } from "../src/jobs/processors/email.processor";
import type { SendEmailJobPayload } from "../src/jobs/queues/email.queue";
import { sendTemplatedEmail } from "../src/modules/email/email.service";

jest.mock("../src/modules/email/email.service", () => ({
  sendTemplatedEmail: jest.fn(),
}));

describe("email processor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(sendTemplatedEmail).mockResolvedValue(undefined);
  });

  it("delegates send-email jobs to the email service", async () => {
    const job = {
      id: "job-1",
      name: "send-email",
      data: {
        to: "approver@example.com",
        subject: "Approval required",
        template: "APPROVAL_REQUIRED",
        data: {
          requestTitle: "New laptop request",
        },
      },
    } as unknown as Job<SendEmailJobPayload>;

    await expect(processSendEmailJob(job)).resolves.toBeUndefined();

    expect(sendTemplatedEmail).toHaveBeenCalledWith({
      to: "approver@example.com",
      template: "APPROVAL_REQUIRED",
      data: {
        requestTitle: "New laptop request",
      },
      subject: "Approval required",
    });
  });
});
