import * as notificationRepository from "../src/modules/notifications/notification.repository";
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
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
  const approverUserId = "660e8400-e29b-41d4-a716-446655440001";
  const approverRoleId = "44444444-4444-4444-8444-444444444444";
  const stepId = "33333333-3333-4333-8333-333333333333";

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(notificationRepository.createNotificationRecord)
      .mockResolvedValue({
        id: "notif-1",
        type: "APPROVAL_REQUIRED",
        organisationId,
        recipientId: approverUserId,
        title: "Approval required",
        message: "Test message",
        entityType: NOTIFICATION_ENTITY_TYPES.WORKFLOW_REQUEST,
        entityId: requestId,
        actionUrl: `/approvals/${requestId}`,
        isRead: false,
        readAt: null,
        createdAt: new Date(),
      });
    jest
      .mocked(notificationRepository.findActiveRecipientIdsByRole)
      .mockResolvedValue([approverUserId]);
    jest
      .mocked(notificationRepository.createManyNotificationRecords)
      .mockResolvedValue({ count: 1 });
  });

  it("records approval required notifications for each active member with the approver role", async () => {
    recordApprovalRequiredNotification({
      organisationId,
      workflowRequestId: requestId,
      workflowTemplateId: templateId,
      stepId,
      approverRoleId,
      stepName: "Manager Approval",
      requestTitle: "New laptop request",
    });

    await Promise.resolve();

    expect(notificationRepository.findActiveRecipientIdsByRole).toHaveBeenCalledWith(
      organisationId,
      approverRoleId,
    );
    expect(notificationRepository.createManyNotificationRecords).toHaveBeenCalledWith([
      expect.objectContaining({
        organisationId,
        recipientId: approverUserId,
        type: NOTIFICATION_TYPES.APPROVAL_REQUIRED,
        title: "Approval required",
        message: 'New laptop request is waiting for your approval at "Manager Approval".',
        entityType: NOTIFICATION_ENTITY_TYPES.WORKFLOW_REQUEST,
        entityId: requestId,
        actionUrl: `/approvals/${requestId}`,
      }),
    ]);
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
        type: NOTIFICATION_TYPES.REQUEST_COMPLETED,
        recipientId: requesterId,
        entityType: NOTIFICATION_ENTITY_TYPES.WORKFLOW_REQUEST,
        entityId: requestId,
        actionUrl: `/requests/${requestId}`,
      }),
    );
  });

  it("records rejected notifications with the comment as message", async () => {
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
        type: NOTIFICATION_TYPES.REQUEST_REJECTED,
        message: "Budget not approved.",
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
        type: NOTIFICATION_TYPES.CHANGES_REQUESTED,
        recipientId: requesterId,
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
        type: NOTIFICATION_TYPES.REQUEST_APPROVED,
        recipientId: requesterId,
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
        recipientId: requesterId,
        type: NOTIFICATION_TYPES.REQUEST_COMPLETED,
        title: "Request completed",
        message: "Your workflow request has been fully approved.",
        entityType: NOTIFICATION_ENTITY_TYPES.WORKFLOW_REQUEST,
        entityId: requestId,
        actionUrl: `/requests/${requestId}`,
      }),
    ).not.toThrow();

    await Promise.resolve();
  });
});
