import type { Request, Response } from "express";

import {
  AuthenticationError,
  AuthorizationError,
} from "../../common/errors/httpErrors";
import { sendSuccess } from "../../common/http/apiResponse";
import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as webhookService from "./webhook.service";
import type {
  CreateWebhookEndpointBody,
  ListWebhookDeliveriesQuery,
  UpdateWebhookEndpointBody,
} from "./webhook.validation";

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

export const createWebhookEndpointController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const organisation = requireOrganisation(req);
    const body = req.body as CreateWebhookEndpointBody;

    const data = await webhookService.createWebhookEndpoint(
      organisation.id,
      localUser.id,
      body,
    );

    sendSuccess(res, {
      data,
      message: "Webhook endpoint created successfully",
      statusCode: 201,
    });
  },
);

export const listWebhookEndpointsController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    requireLocalUser(req);
    const organisation = requireOrganisation(req);

    const data = await webhookService.listWebhookEndpoints(organisation.id);

    sendSuccess(res, {
      data,
      message: "Webhook endpoints retrieved successfully",
    });
  },
);

export const getWebhookEndpointController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    requireLocalUser(req);
    const organisation = requireOrganisation(req);

    const data = await webhookService.getWebhookEndpoint(
      organisation.id,
      req.params.id,
    );

    sendSuccess(res, {
      data,
      message: "Webhook endpoint retrieved successfully",
    });
  },
);

export const updateWebhookEndpointController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    requireLocalUser(req);
    const organisation = requireOrganisation(req);
    const body = req.body as UpdateWebhookEndpointBody;

    const data = await webhookService.updateWebhookEndpoint(
      organisation.id,
      req.params.id,
      body,
    );

    sendSuccess(res, {
      data,
      message: "Webhook endpoint updated successfully",
    });
  },
);

export const deleteWebhookEndpointController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    requireLocalUser(req);
    const organisation = requireOrganisation(req);

    await webhookService.deleteWebhookEndpoint(organisation.id, req.params.id);

    sendSuccess(res, {
      data: null,
      message: "Webhook endpoint deleted successfully",
    });
  },
);

export const listWebhookDeliveriesController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    requireLocalUser(req);
    const organisation = requireOrganisation(req);
    const query = req.query as ListWebhookDeliveriesQuery;

    const data = await webhookService.listWebhookDeliveries(
      organisation.id,
      req.params.id,
      query.limit ?? 20,
    );

    sendSuccess(res, {
      data,
      message: "Webhook deliveries retrieved successfully",
    });
  },
);
