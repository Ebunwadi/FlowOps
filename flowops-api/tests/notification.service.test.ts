import { NotFoundError } from "../src/common/errors/httpErrors";
import * as notificationRepository from "../src/modules/notifications/notification.repository";
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
  createManyNotifications,
  createNotification,
  getUnreadNotificationCount,
  getUserNotifications,
  markAllAsRead,
  markAsRead,
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

describe("notification inbox service", () => {
  const organisationId = "550e8400-e29b-41d4-a716-446655440000";
  const requestId = "aaaa9999-9999-4999-8999-999999999999";
  const requesterId = "770e8400-e29b-41d4-a716-446655440002";
  const notificationId = "dddd6666-6666-4666-8666-666666666666";
  const createdAt = new Date("2026-06-29T12:00:00.000Z");

  const notificationRecord = {
    id: notificationId,
    type: "REQUEST_COMPLETED" as const,
    organisationId,
    recipientId: requesterId,
    title: "Request completed",
    message: "Your workflow request has been fully approved.",
    entityType: NOTIFICATION_ENTITY_TYPES.WORKFLOW_REQUEST,
    entityId: requestId,
    actionUrl: `/requests/${requestId}`,
    isRead: false,
    readAt: null,
    createdAt,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a notification and maps the response", async () => {
    jest
      .mocked(notificationRepository.createNotificationRecord)
      .mockResolvedValue(notificationRecord);

    const result = await createNotification({
      organisationId,
      recipientId: requesterId,
      type: NOTIFICATION_TYPES.REQUEST_COMPLETED,
      title: notificationRecord.title,
      message: notificationRecord.message,
      entityType: notificationRecord.entityType,
      entityId: notificationRecord.entityId,
      actionUrl: notificationRecord.actionUrl,
    });

    expect(result).toEqual({
      id: notificationId,
      type: "REQUEST_COMPLETED",
      title: "Request completed",
      message: "Your workflow request has been fully approved.",
      entityType: NOTIFICATION_ENTITY_TYPES.WORKFLOW_REQUEST,
      entityId: requestId,
      actionUrl: `/requests/${requestId}`,
      isRead: false,
      readAt: null,
      createdAt: createdAt.toISOString(),
    });
  });

  it("creates many notifications in one batch", async () => {
    jest
      .mocked(notificationRepository.createManyNotificationRecords)
      .mockResolvedValue({ count: 2 });

    const result = await createManyNotifications([
      {
        organisationId,
        recipientId: requesterId,
        type: NOTIFICATION_TYPES.APPROVAL_REQUIRED,
        title: "Approval required",
        message: "Waiting for approval.",
      },
      {
        organisationId,
        recipientId: requesterId,
        type: NOTIFICATION_TYPES.APPROVAL_REQUIRED,
        title: "Approval required",
        message: "Waiting for approval.",
      },
    ]);

    expect(result).toEqual({ count: 2 });
  });

  it("returns paginated notifications for a user", async () => {
    jest
      .mocked(notificationRepository.findNotificationsForUser)
      .mockResolvedValue([notificationRecord]);
    jest.mocked(notificationRepository.countNotificationsForUser).mockResolvedValue(1);

    const result = await getUserNotifications(organisationId, requesterId, {
      page: 1,
      limit: 20,
    });

    expect(notificationRepository.findNotificationsForUser).toHaveBeenCalledWith({
      organisationId,
      recipientId: requesterId,
      isRead: undefined,
      page: 1,
      limit: 20,
    });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it("returns unread notification count for a user", async () => {
    jest
      .mocked(notificationRepository.countUnreadNotificationsForUser)
      .mockResolvedValue(3);

    const result = await getUnreadNotificationCount(organisationId, requesterId);

    expect(result).toEqual({ count: 3 });
  });

  it("marks a notification as read for the recipient", async () => {
    const readAt = new Date("2026-06-29T12:05:00.000Z");
    jest.mocked(notificationRepository.markNotificationAsRead).mockResolvedValue({
      ...notificationRecord,
      isRead: true,
      readAt,
    });

    const result = await markAsRead(organisationId, requesterId, notificationId);

    expect(notificationRepository.markNotificationAsRead).toHaveBeenCalledWith(
      notificationId,
      organisationId,
      requesterId,
    );
    expect(result.isRead).toBe(true);
    expect(result.readAt).toBe(readAt.toISOString());
  });

  it("throws when marking a notification that does not belong to the user", async () => {
    jest.mocked(notificationRepository.markNotificationAsRead).mockResolvedValue(null);

    await expect(
      markAsRead(organisationId, requesterId, notificationId),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("marks all unread notifications as read for the user", async () => {
    jest
      .mocked(notificationRepository.markAllNotificationsAsReadForUser)
      .mockResolvedValue({ count: 4 });

    const result = await markAllAsRead(organisationId, requesterId);

    expect(notificationRepository.markAllNotificationsAsReadForUser).toHaveBeenCalledWith(
      organisationId,
      requesterId,
    );
    expect(result).toEqual({ updatedCount: 4 });
  });
});
