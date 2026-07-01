import { enqueueSendEmailJob } from "../src/jobs/queues/email.queue";
import { EMAIL_TEMPLATE_NAMES } from "../src/modules/email/email.types";
import {
  enqueueApprovalRequiredEmails,
  enqueueChangesRequestedEmail,
  enqueueRequestCompletedEmail,
  enqueueRequestRejectedEmail,
} from "../src/modules/notifications/notification.email";

jest.mock("../src/jobs/queues/email.queue", () => ({
  enqueueSendEmailJob: jest.fn(),
}));

describe("notification email delivery", () => {
  const recipient = {
    userId: "660e8400-e29b-41d4-a716-446655440001",
    email: "approver@example.com",
    firstName: "Alex",
    lastName: "Approver",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(enqueueSendEmailJob).mockResolvedValue({ id: "job-1" } as never);
  });

  it("enqueues approval required email jobs for each recipient", async () => {
    await enqueueApprovalRequiredEmails({
      recipients: [recipient],
      requestTitle: "New laptop request",
      workflowName: "Equipment Request",
      actionUrl: "/approvals/req-1",
    });

    expect(enqueueSendEmailJob).toHaveBeenCalledWith({
      to: "approver@example.com",
      subject: "Approval required",
      template: EMAIL_TEMPLATE_NAMES.APPROVAL_REQUIRED,
      data: {
        recipientName: "Alex Approver",
        requestTitle: "New laptop request",
        workflowName: "Equipment Request",
        actionUrl: "/approvals/req-1",
      },
    });
  });

  it("enqueues request completed email for the requester", async () => {
    await enqueueRequestCompletedEmail({
      recipient,
      requestTitle: "New laptop request",
      actionUrl: "/requests/req-1",
    });

    expect(enqueueSendEmailJob).toHaveBeenCalledWith({
      to: "approver@example.com",
      subject: "Request completed",
      template: EMAIL_TEMPLATE_NAMES.REQUEST_COMPLETED,
      data: {
        recipientName: "Alex Approver",
        requestTitle: "New laptop request",
        actionUrl: "/requests/req-1",
      },
    });
  });

  it("enqueues request rejected email for the requester", async () => {
    await enqueueRequestRejectedEmail({
      recipient,
      requestTitle: "New laptop request",
      comment: "Budget not approved.",
      actionUrl: "/requests/req-1",
    });

    expect(enqueueSendEmailJob).toHaveBeenCalledWith({
      to: "approver@example.com",
      subject: "Request rejected",
      template: EMAIL_TEMPLATE_NAMES.REQUEST_REJECTED,
      data: {
        recipientName: "Alex Approver",
        requestTitle: "New laptop request",
        comment: "Budget not approved.",
        actionUrl: "/requests/req-1",
      },
    });
  });

  it("enqueues changes requested email for the requester", async () => {
    await enqueueChangesRequestedEmail({
      recipient,
      requestTitle: "New laptop request",
      comment: "Please add a cost breakdown.",
      actionUrl: "/requests/req-1",
    });

    expect(enqueueSendEmailJob).toHaveBeenCalledWith({
      to: "approver@example.com",
      subject: "Changes requested",
      template: EMAIL_TEMPLATE_NAMES.CHANGES_REQUESTED,
      data: {
        recipientName: "Alex Approver",
        requestTitle: "New laptop request",
        comment: "Please add a cost breakdown.",
        actionUrl: "/requests/req-1",
      },
    });
  });
});
