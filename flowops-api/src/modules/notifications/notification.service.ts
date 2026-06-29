import type { NotificationType } from "../../generated/prisma/client";
import { NotFoundError } from "../../common/errors/httpErrors";
import { logger } from "../../config/logger";
import {
  toNotificationResponse,
  type MarkAllNotificationsReadResponse,
  type NotificationResponse,
  type PaginatedNotificationsResponse,
  type UnreadNotificationCountResponse,
} from "./notification.mapper";
import {
  countNotificationsForUser,
  countUnreadNotificationsForUser,
  createManyNotificationRecords,
  createNotificationRecord,
  findActiveRecipientIdsByRole,
  findNotificationsForUser,
  markAllNotificationsAsReadForUser,
  markNotificationAsRead,
  type CreateNotificationRecordInput,
} from "./notification.repository";
import type { ListNotificationsQuery } from "./notification.validation";

export const NOTIFICATION_TYPES = {
  APPROVAL_REQUIRED: "APPROVAL_REQUIRED",
  REQUEST_APPROVED: "REQUEST_APPROVED",
  REQUEST_REJECTED: "REQUEST_REJECTED",
  REQUEST_COMPLETED: "REQUEST_COMPLETED",
  CHANGES_REQUESTED: "CHANGES_REQUESTED",
  COMMENT_ADDED: "COMMENT_ADDED",
  MEMBER_INVITED: "MEMBER_INVITED",
  WORKFLOW_UPDATED: "WORKFLOW_UPDATED",
} as const satisfies Record<string, NotificationType>;

export const NOTIFICATION_ENTITY_TYPES = {
  WORKFLOW_REQUEST: "WorkflowRequest",
} as const;

export interface RecordNotificationInput {
  organisationId: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  actionUrl?: string | null;
}

export type CreateNotificationInput = CreateNotificationRecordInput;

export async function createNotification(
  input: CreateNotificationInput,
): Promise<NotificationResponse> {
  const notification = await createNotificationRecord(input);
  return toNotificationResponse(notification);
}

export async function createManyNotifications(
  inputs: CreateNotificationInput[],
): Promise<{ count: number }> {
  return createManyNotificationRecords(inputs);
}

export async function getUserNotifications(
  organisationId: string,
  recipientId: string,
  query: ListNotificationsQuery,
): Promise<PaginatedNotificationsResponse> {
  const filters = {
    organisationId,
    recipientId,
    isRead: query.isRead,
    page: query.page,
    limit: query.limit,
  };

  const [notifications, total] = await Promise.all([
    findNotificationsForUser(filters),
    countNotificationsForUser(filters),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

  return {
    items: notifications.map(toNotificationResponse),
    page: query.page,
    limit: query.limit,
    total,
    totalPages,
  };
}

export async function getUnreadNotificationCount(
  organisationId: string,
  recipientId: string,
): Promise<UnreadNotificationCountResponse> {
  const count = await countUnreadNotificationsForUser(organisationId, recipientId);
  return { count };
}

export async function markAsRead(
  organisationId: string,
  recipientId: string,
  notificationId: string,
): Promise<NotificationResponse> {
  const notification = await markNotificationAsRead(
    notificationId,
    organisationId,
    recipientId,
  );

  if (!notification) {
    throw new NotFoundError("Notification not found");
  }

  return toNotificationResponse(notification);
}

export async function markAllAsRead(
  organisationId: string,
  recipientId: string,
): Promise<MarkAllNotificationsReadResponse> {
  const result = await markAllNotificationsAsReadForUser(organisationId, recipientId);
  return { updatedCount: result.count };
}

function workflowRequestActionUrl(requestId: string): string {
  return `/requests/${requestId}`;
}

function approvalReviewActionUrl(requestId: string): string {
  return `/approvals/${requestId}`;
}

export function recordNotification(input: RecordNotificationInput): void {
  void createNotificationRecord(input).catch((error) => {
    logger.error(
      {
        origin: "api",
        event: "notification.record_failed",
        notificationType: input.type,
        organisationId: input.organisationId,
        recipientId: input.recipientId,
        entityId: input.entityId,
        error,
      },
      "[API] Failed to persist notification record",
    );
  });
}

interface WorkflowRequestNotificationContext {
  organisationId: string;
  workflowRequestId: string;
  workflowTemplateId: string;
}

interface RoleApprovalNotificationContext extends WorkflowRequestNotificationContext {
  stepId: string;
  approverRoleId: string;
  stepName: string;
  requestTitle?: string | null;
}

interface RequesterNotificationContext extends WorkflowRequestNotificationContext {
  requesterId: string;
}

interface RequesterCommentNotificationContext extends RequesterNotificationContext {
  comment: string;
}

interface RequesterStepApprovedContext extends RequesterNotificationContext {
  approvedStepName: string;
  nextStepName: string;
}

async function recordApprovalRequiredNotificationsForRole(
  input: RoleApprovalNotificationContext,
): Promise<void> {
  const recipientIds = await findActiveRecipientIdsByRole(
    input.organisationId,
    input.approverRoleId,
  );

  if (recipientIds.length === 0) {
    logger.warn(
      {
        origin: "api",
        event: "notification.no_recipients_for_role",
        organisationId: input.organisationId,
        approverRoleId: input.approverRoleId,
        workflowRequestId: input.workflowRequestId,
      },
      "[API] No active members found for approval notification role",
    );
    return;
  }

  const requestLabel = input.requestTitle?.trim() || "A workflow request";
  const title = "Approval required";
  const message = `${requestLabel} is waiting for your approval at "${input.stepName}".`;

  await createManyNotificationRecords(
    recipientIds.map((recipientId) => ({
      organisationId: input.organisationId,
      recipientId,
      type: NOTIFICATION_TYPES.APPROVAL_REQUIRED,
      title,
      message,
      entityType: NOTIFICATION_ENTITY_TYPES.WORKFLOW_REQUEST,
      entityId: input.workflowRequestId,
      actionUrl: approvalReviewActionUrl(input.workflowRequestId),
    })),
  );
}

export function recordApprovalRequiredNotification(
  input: RoleApprovalNotificationContext,
): void {
  void recordApprovalRequiredNotificationsForRole(input).catch((error) => {
    logger.error(
      {
        origin: "api",
        event: "notification.record_failed",
        notificationType: NOTIFICATION_TYPES.APPROVAL_REQUIRED,
        organisationId: input.organisationId,
        workflowRequestId: input.workflowRequestId,
        error,
      },
      "[API] Failed to persist approval required notifications",
    );
  });
}

export function recordRequestApprovedStepNotification(
  input: RequesterStepApprovedContext,
): void {
  recordNotification({
    organisationId: input.organisationId,
    recipientId: input.requesterId,
    type: NOTIFICATION_TYPES.REQUEST_APPROVED,
    title: `Step approved: ${input.approvedStepName}`,
    message: `Your request was approved at "${input.approvedStepName}" and moved to "${input.nextStepName}".`,
    entityType: NOTIFICATION_ENTITY_TYPES.WORKFLOW_REQUEST,
    entityId: input.workflowRequestId,
    actionUrl: workflowRequestActionUrl(input.workflowRequestId),
  });
}

export function recordRequestCompletedNotification(
  input: RequesterNotificationContext,
): void {
  recordNotification({
    organisationId: input.organisationId,
    recipientId: input.requesterId,
    type: NOTIFICATION_TYPES.REQUEST_COMPLETED,
    title: "Request completed",
    message: "Your workflow request has been fully approved.",
    entityType: NOTIFICATION_ENTITY_TYPES.WORKFLOW_REQUEST,
    entityId: input.workflowRequestId,
    actionUrl: workflowRequestActionUrl(input.workflowRequestId),
  });
}

export function recordRequestRejectedNotification(
  input: RequesterCommentNotificationContext,
): void {
  recordNotification({
    organisationId: input.organisationId,
    recipientId: input.requesterId,
    type: NOTIFICATION_TYPES.REQUEST_REJECTED,
    title: "Request rejected",
    message: input.comment,
    entityType: NOTIFICATION_ENTITY_TYPES.WORKFLOW_REQUEST,
    entityId: input.workflowRequestId,
    actionUrl: workflowRequestActionUrl(input.workflowRequestId),
  });
}

export function recordChangesRequestedNotification(
  input: RequesterCommentNotificationContext,
): void {
  recordNotification({
    organisationId: input.organisationId,
    recipientId: input.requesterId,
    type: NOTIFICATION_TYPES.CHANGES_REQUESTED,
    title: "Changes requested",
    message: input.comment,
    entityType: NOTIFICATION_ENTITY_TYPES.WORKFLOW_REQUEST,
    entityId: input.workflowRequestId,
    actionUrl: workflowRequestActionUrl(input.workflowRequestId),
  });
}
