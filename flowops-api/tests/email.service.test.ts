import { logger } from "../src/config/logger";
import { sendEmail, sendTemplatedEmail } from "../src/modules/email/email.service";
import { EMAIL_TEMPLATE_NAMES } from "../src/modules/email/email.types";

jest.mock("../src/config/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe("email service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("logs console delivery in test mode", async () => {
    await sendEmail({
      to: "user@example.com",
      subject: "Test",
      text: "Hello",
      html: "<p>Hello</p>",
    });

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "email.console_delivery",
        to: "user@example.com",
        subject: "Test",
      }),
      expect.stringContaining("Console delivery"),
    );
  });

  it("sends templated email using rendered subject", async () => {
    await sendTemplatedEmail({
      to: "approver@example.com",
      template: EMAIL_TEMPLATE_NAMES.APPROVAL_REQUIRED,
      data: {
        recipientName: "Alex",
        requestTitle: "New laptop",
        workflowName: "IT procurement",
        actionUrl: "/approvals/req-1",
      },
    });

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "email.console_delivery",
        to: "approver@example.com",
        subject: "Approval required",
      }),
      expect.any(String),
    );
  });
});
