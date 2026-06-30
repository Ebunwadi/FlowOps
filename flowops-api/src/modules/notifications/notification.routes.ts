import { Router } from "express";

import { authenticate } from "../../common/middleware/authenticate";
import { ensureLocalUser } from "../../common/middleware/ensureLocalUser";
import { ensureOrganisationContext } from "../../common/middleware/ensureOrganisationContext";
import { requirePermission } from "../../common/middleware/requirePermission";
import { validateRequest } from "../../common/middleware/validateRequest";
import {
  getUnreadNotificationCountController,
  listNotificationsController,
  markAllNotificationsAsReadController,
  markNotificationAsReadController,
} from "./notification.controller";
import {
  listNotificationsQuerySchema,
  notificationParamsSchema,
} from "./notification.validation";

export const notificationRouter = Router();

notificationRouter.use(authenticate, ensureLocalUser);

notificationRouter.get(
  "/unread-count",
  ensureOrganisationContext,
  requirePermission("notifications:view"),
  getUnreadNotificationCountController,
);

notificationRouter.patch(
  "/read-all",
  ensureOrganisationContext,
  requirePermission("notifications:update"),
  markAllNotificationsAsReadController,
);

notificationRouter.get(
  "/",
  ensureOrganisationContext,
  requirePermission("notifications:view"),
  validateRequest({ query: listNotificationsQuerySchema }),
  listNotificationsController,
);

notificationRouter.patch(
  "/:id/read",
  ensureOrganisationContext,
  requirePermission("notifications:update"),
  validateRequest({ params: notificationParamsSchema }),
  markNotificationAsReadController,
);
