import type { Job } from "bullmq";

import { processSendEmailJob } from "../src/jobs/processors/email.processor";
import type { SendEmailJobPayload } from "../src/jobs/queues/email.queue";

describe("email processor", () => {
  it("processes send-email jobs without throwing", async () => {
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
  });
});
