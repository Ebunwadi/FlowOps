import {
  notifyApproversOfNextStep,
} from "../src/modules/approvals/approval.notifications";
import { recordApprovalRequiredNotification } from "../src/modules/notifications/notification.service";

jest.mock("../src/modules/notifications/notification.service", () => ({
  recordApprovalRequiredNotification: jest.fn(),
  recordChangesRequestedNotification: jest.fn(),
  recordRequestApprovedStepNotification: jest.fn(),
  recordRequestCompletedNotification: jest.fn(),
  recordRequestRejectedNotification: jest.fn(),
}));

describe("approval notifications", () => {
  const organisationId = "550e8400-e29b-41d4-a716-446655440000";
  const requestId = "aaaa9999-9999-4999-8999-999999999999";
  const templateId = "99999999-9999-4999-8999-999999999999";
  const nextStepId = "44444444-4444-4444-8444-444444444444";
  const nextApproverRoleId = "55555555-5555-4555-8555-555555555555";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("notifies the next step approver role when a request advances", () => {
    notifyApproversOfNextStep({
      organisationId,
      workflowRequestId: requestId,
      workflowTemplateId: templateId,
      stepId: nextStepId,
      approverRoleId: nextApproverRoleId,
      stepName: "IT Approval",
      requestTitle: "New laptop request",
      workflowName: "Equipment Request",
    });

    expect(recordApprovalRequiredNotification).toHaveBeenCalledWith({
      organisationId,
      workflowRequestId: requestId,
      workflowTemplateId: templateId,
      stepId: nextStepId,
      approverRoleId: nextApproverRoleId,
      stepName: "IT Approval",
      requestTitle: "New laptop request",
      workflowName: "Equipment Request",
    });
  });
});
