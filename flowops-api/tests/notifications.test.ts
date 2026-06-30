import express, { Router, type Express } from "express";
import request from "supertest";

import { NotFoundError } from "../src/common/errors/httpErrors";
import { errorHandler } from "../src/common/middleware/errorHandler";
import { createRequirePermissionMiddleware } from "../src/common/middleware/requirePermission";
import { validateRequest } from "../src/common/middleware/validateRequest";
import { logger } from "../src/config/logger";
import { MembershipStatus } from "../src/generated/prisma/client";
import {
  getUnreadNotificationCountController,
  listNotificationsController,
  markAllNotificationsAsReadController,
  markNotificationAsReadController,
} from "../src/modules/notifications/notification.controller";
import * as notificationService from "../src/modules/notifications/notification.service";
import {
  listNotificationsQuerySchema,
  notificationParamsSchema,
} from "../src/modules/notifications/notification.validation";

jest.mock("../src/modules/notifications/notification.service");

const organisationId = "550e8400-e29b-41d4-a716-446655440000";
const userId = "770e8400-e29b-41d4-a716-446655440002";
const notificationId = "dddd6666-6666-4666-8666-666666666666";
const roleId = "44444444-4444-4444-8444-444444444444";

function attachTestContext(
  req: express.Request,
  _res: express.Response,
  next: express.NextFunction,
): void {
  req.localUser = {
    id: userId,
    keycloakUserId: "keycloak-user-id-1",
    email: "test.user@flowops.local",
    firstName: "Test",
    lastName: "User",
    createdAt: new Date("2026-06-08T12:00:00.000Z"),
    updatedAt: new Date("2026-06-08T12:00:00.000Z"),
  };
  req.organisation = {
    id: organisationId,
    name: "FlowOps Demo Organisation",
    slug: "flowops-demo",
    createdById: userId,
    createdAt: new Date("2026-06-11T12:00:00.000Z"),
    updatedAt: new Date("2026-06-11T12:00:00.000Z"),
  };
  req.membership = {
    id: "member-1",
    userId,
    organisationId,
    roleId,
    status: MembershipStatus.ACTIVE,
    joinedAt: new Date("2026-06-11T12:00:00.000Z"),
    role: {
      id: roleId,
      name: "Staff",
    },
  };
  next();
}

function createNotificationsTestApp(permissions: string[]): Express {
  const app = express();
  app.use(express.json());

  const lookupPermissions = async (_roleId: string) => permissions;
  const router = Router();

  router.use(attachTestContext);

  router.get(
    "/unread-count",
    createRequirePermissionMiddleware(["notifications:view"], lookupPermissions),
    getUnreadNotificationCountController,
  );

  router.patch(
    "/read-all",
    createRequirePermissionMiddleware(["notifications:update"], lookupPermissions),
    markAllNotificationsAsReadController,
  );

  router.get(
    "/",
    createRequirePermissionMiddleware(["notifications:view"], lookupPermissions),
    validateRequest({ query: listNotificationsQuerySchema }),
    listNotificationsController,
  );

  router.patch(
    "/:id/read",
    createRequirePermissionMiddleware(["notifications:update"], lookupPermissions),
    validateRequest({ params: notificationParamsSchema }),
    markNotificationAsReadController,
  );

  app.use("/api/notifications", router);
  app.use(errorHandler(logger));
  return app;
}

describe("Notification API", () => {
  const app = createNotificationsTestApp([
    "notifications:view",
    "notifications:update",
  ]);

  const notificationResponse = {
    id: notificationId,
    type: "APPROVAL_REQUIRED" as const,
    title: "Approval required",
    message: "New laptop request is waiting for your approval.",
    entityType: "WorkflowRequest",
    entityId: "aaaa9999-9999-4999-8999-999999999999",
    actionUrl: "/approvals/aaaa9999-9999-4999-8999-999999999999",
    isRead: false,
    readAt: null,
    createdAt: "2026-06-29T12:00:00.000Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists notifications for the current user in the organisation", async () => {
    jest.mocked(notificationService.getUserNotifications).mockResolvedValue({
      items: [notificationResponse],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });

    const response = await request(app).get("/api/notifications").expect(200);

    expect(notificationService.getUserNotifications).toHaveBeenCalledWith(
      organisationId,
      userId,
      expect.objectContaining({ page: 1, limit: 20 }),
    );
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.message).toBe("Notifications retrieved successfully");
  });

  it("returns unread notification count for the current user", async () => {
    jest
      .mocked(notificationService.getUnreadNotificationCount)
      .mockResolvedValue({ count: 3 });

    const response = await request(app)
      .get("/api/notifications/unread-count")
      .expect(200);

    expect(notificationService.getUnreadNotificationCount).toHaveBeenCalledWith(
      organisationId,
      userId,
    );
    expect(response.body.data).toEqual({ count: 3 });
  });

  it("marks a notification as read for the current user", async () => {
    jest.mocked(notificationService.markAsRead).mockResolvedValue({
      ...notificationResponse,
      isRead: true,
      readAt: "2026-06-29T12:05:00.000Z",
    });

    const response = await request(app)
      .patch(`/api/notifications/${notificationId}/read`)
      .expect(200);

    expect(notificationService.markAsRead).toHaveBeenCalledWith(
      organisationId,
      userId,
      notificationId,
    );
    expect(response.body.data.isRead).toBe(true);
  });

  it("returns 404 when marking a notification that does not belong to the user", async () => {
    jest
      .mocked(notificationService.markAsRead)
      .mockRejectedValue(new NotFoundError("Notification not found"));

    const response = await request(app)
      .patch(`/api/notifications/${notificationId}/read`)
      .expect(404);

    expect(response.body.message).toBe("Notification not found");
  });

  it("marks all notifications as read for the current user", async () => {
    jest
      .mocked(notificationService.markAllAsRead)
      .mockResolvedValue({ updatedCount: 4 });

    const response = await request(app)
      .patch("/api/notifications/read-all")
      .expect(200);

    expect(notificationService.markAllAsRead).toHaveBeenCalledWith(
      organisationId,
      userId,
    );
    expect(response.body.data).toEqual({ updatedCount: 4 });
  });

  it("returns 403 when the user lacks notifications:view", async () => {
    const restrictedApp = createNotificationsTestApp(["notifications:update"]);

    const response = await request(restrictedApp).get("/api/notifications").expect(403);

    expect(response.body.message).toBe(
      "Missing required permission: notifications:view",
    );
    expect(notificationService.getUserNotifications).not.toHaveBeenCalled();
  });

  it("returns 403 when the user lacks notifications:update", async () => {
    const restrictedApp = createNotificationsTestApp(["notifications:view"]);

    const response = await request(restrictedApp)
      .patch("/api/notifications/read-all")
      .expect(403);

    expect(response.body.message).toBe(
      "Missing required permission: notifications:update",
    );
    expect(notificationService.markAllAsRead).not.toHaveBeenCalled();
  });
});
