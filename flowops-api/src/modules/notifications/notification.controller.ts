import type { Request, Response } from "express";

import {
  AuthenticationError,
  AuthorizationError,
} from "../../common/errors/httpErrors";
import { sendSuccess } from "../../common/http/apiResponse";
import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as notificationService from "./notification.service";
import type { ListNotificationsQuery } from "./notification.validation";

function requireLocalUser(req: Request) {
  if (!req.localUser) {
    throw new AuthenticationError();
  }

  return req.localUser;
}

function requireOrganisation(req: Request) {
  if (!req.organisation) {
    throw new AuthorizationError("Organisation context is required");
  }

  return req.organisation;
}

export const listNotificationsController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const organisation = requireOrganisation(req);
    const query = req.query as unknown as ListNotificationsQuery;

    const data = await notificationService.getUserNotifications(
      organisation.id,
      localUser.id,
      query,
    );

    sendSuccess(res, {
      data,
      message: "Notifications retrieved successfully",
    });
  },
);

export const getUnreadNotificationCountController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const organisation = requireOrganisation(req);

    const data = await notificationService.getUnreadNotificationCount(
      organisation.id,
      localUser.id,
    );

    sendSuccess(res, {
      data,
      message: "Unread notification count retrieved successfully",
    });
  },
);

export const markNotificationAsReadController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const organisation = requireOrganisation(req);

    const data = await notificationService.markAsRead(
      organisation.id,
      localUser.id,
      req.params.id,
    );

    sendSuccess(res, {
      data,
      message: "Notification marked as read",
    });
  },
);

export const markAllNotificationsAsReadController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const organisation = requireOrganisation(req);

    const data = await notificationService.markAllAsRead(
      organisation.id,
      localUser.id,
    );

    sendSuccess(res, {
      data,
      message: "All notifications marked as read",
    });
  },
);
