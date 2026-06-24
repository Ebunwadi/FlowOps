import * as notificationRepository from "../src/modules/notifications/notification.repository";
import {
  NOTIFICATION_EVENTS,
  recordApprovalRequiredNotification,
  recordChangesRequestedNotification,
  recordNotification,
  recordRequestApprovedStepNotification,
  recordRequestCompletedNotification,
  recordRequestRejectedNotification,
} from "../src/modules/notifications/notification.service";

jest.mock("../src/modules/notifications/notification.repository");

describe("notification service", () => {
  const organisationId = "550e8400-e29b-41d4-a716-446655440000";
  const requestId = "aaaa9999-9999-4999-8999-999999999999";
  const templateId = "99999999-9999-4999-8999-999999999999";
  const requesterId = "770e8400-e29b-41d4-a716-446655440002";
  const approverRoleId = "44444444-4444-4444-8444-444444444444";
  const stepId = "33333333-3333-4333-8333-333333333333";

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(notificationRepository.createNotificationRecord)
      .mockResolvedValue({
        id: "notif-1",
        event: "APPROVAL_REQUIRED",
        organisationId,
        recipientUserId: null,
        recipientRoleId: approverRoleId,
        workflowRequestId: requestId,
      } as never);
  });

  it("records approval required notifications for a role", async () => {
    recordApprovalRequiredNotification({
      organisationId,
      workflowRequestId: requestId,
      workflowTemplateId: templateId,
      stepId,
      approverRoleId,
      stepName: "Manager Approval",
    });

    await Promise.resolve();

    expect(notificationRepository.createNotificationRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        organisationId,
        event: NOTIFICATION_EVENTS.APPROVAL_REQUIRED,
        recipientRoleId: approverRoleId,
        workflowRequestId: requestId,
        title: "Approval required: Manager Approval",
      }),
    );
  });

  it("records request completed notifications for the requester", async () => {
    recordRequestCompletedNotification({
      organisationId,
      workflowRequestId: requestId,
      workflowTemplateId: templateId,
      requesterId,
    });

    await Promise.resolve();

    expect(notificationRepository.createNotificationRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        event: NOTIFICATION_EVENTS.REQUEST_COMPLETED,
        recipientUserId: requesterId,
      }),
    );
  });

  it("records rejected notifications with the comment as body", async () => {
    recordRequestRejectedNotification({
      organisationId,
      workflowRequestId: requestId,
      workflowTemplateId: templateId,
      requesterId,
      comment: "Budget not approved.",
    });

    await Promise.resolve();

    expect(notificationRepository.createNotificationRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        event: NOTIFICATION_EVENTS.REQUEST_REJECTED,
        body: "Budget not approved.",
      }),
    );
  });

  it("records changes requested notifications for the requester", async () => {
    recordChangesRequestedNotification({
      organisationId,
      workflowRequestId: requestId,
      workflowTemplateId: templateId,
      requesterId,
      comment: "Please add a cost breakdown.",
    });

    await Promise.resolve();

    expect(notificationRepository.createNotificationRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        event: NOTIFICATION_EVENTS.CHANGES_REQUESTED,
        recipientUserId: requesterId,
      }),
    );
  });

  it("records step approved notifications for the requester", async () => {
    recordRequestApprovedStepNotification({
      organisationId,
      workflowRequestId: requestId,
      workflowTemplateId: templateId,
      requesterId,
      approvedStepName: "Manager Approval",
      nextStepName: "IT Approval",
    });

    await Promise.resolve();

    expect(notificationRepository.createNotificationRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        event: NOTIFICATION_EVENTS.REQUEST_APPROVED_STEP,
        recipientUserId: requesterId,
      }),
    );
  });

  it("does not throw when persistence fails", async () => {
    jest
      .mocked(notificationRepository.createNotificationRecord)
      .mockRejectedValue(new Error("database unavailable"));

    expect(() =>
      recordNotification({
        organisationId,
        event: NOTIFICATION_EVENTS.APPROVAL_REQUIRED,
        recipientRoleId: approverRoleId,
        workflowRequestId: requestId,
        title: "Approval required",
      }),
    ).not.toThrow();

    await Promise.resolve();
  });
});
