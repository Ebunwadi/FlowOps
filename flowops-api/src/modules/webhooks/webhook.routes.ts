import { Router } from "express";

import { authenticate } from "../../common/middleware/authenticate";
import { ensureLocalUser } from "../../common/middleware/ensureLocalUser";
import { ensureOrganisationContext } from "../../common/middleware/ensureOrganisationContext";
import { requirePermission } from "../../common/middleware/requirePermission";
import { validateRequest } from "../../common/middleware/validateRequest";
import {
  createWebhookEndpointController,
  deleteWebhookEndpointController,
  getWebhookEndpointController,
  listWebhookDeliveriesController,
  listWebhookEndpointsController,
  updateWebhookEndpointController,
} from "./webhook.controller";
import {
  createWebhookEndpointSchema,
  listWebhookDeliveriesQuerySchema,
  updateWebhookEndpointSchema,
  webhookEndpointParamsSchema,
} from "./webhook.validation";

export const webhookRouter = Router();

webhookRouter.use(authenticate, ensureLocalUser);

webhookRouter.get(
  "/",
  ensureOrganisationContext,
  requirePermission("webhooks:manage"),
  listWebhookEndpointsController,
);

webhookRouter.post(
  "/",
  ensureOrganisationContext,
  requirePermission("webhooks:manage"),
  validateRequest({ body: createWebhookEndpointSchema }),
  createWebhookEndpointController,
);

webhookRouter.get(
  "/:id",
  ensureOrganisationContext,
  requirePermission("webhooks:manage"),
  validateRequest({ params: webhookEndpointParamsSchema }),
  getWebhookEndpointController,
);

webhookRouter.patch(
  "/:id",
  ensureOrganisationContext,
  requirePermission("webhooks:manage"),
  validateRequest({
    params: webhookEndpointParamsSchema,
    body: updateWebhookEndpointSchema,
  }),
  updateWebhookEndpointController,
);

webhookRouter.delete(
  "/:id",
  ensureOrganisationContext,
  requirePermission("webhooks:manage"),
  validateRequest({ params: webhookEndpointParamsSchema }),
  deleteWebhookEndpointController,
);

webhookRouter.get(
  "/:id/deliveries",
  ensureOrganisationContext,
  requirePermission("webhooks:manage"),
  validateRequest({
    params: webhookEndpointParamsSchema,
    query: listWebhookDeliveriesQuerySchema,
  }),
  listWebhookDeliveriesController,
);
