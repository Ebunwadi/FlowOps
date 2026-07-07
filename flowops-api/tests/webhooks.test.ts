import express, { Router, type Express } from "express";
import request from "supertest";

import { AuthorizationError } from "../src/common/errors/httpErrors";
import { errorHandler } from "../src/common/middleware/errorHandler";
import { createRequirePermissionMiddleware } from "../src/common/middleware/requirePermission";
import { validateRequest } from "../src/common/middleware/validateRequest";
import { logger } from "../src/config/logger";
import { MembershipStatus } from "../src/generated/prisma/client";
import {
  createWebhookEndpointController,
  deleteWebhookEndpointController,
  getWebhookEndpointController,
  listWebhookDeliveriesController,
  listWebhookEndpointsController,
  updateWebhookEndpointController,
} from "../src/modules/webhooks/webhook.controller";
import * as webhookService from "../src/modules/webhooks/webhook.service";
import {
  createWebhookEndpointSchema,
  listWebhookDeliveriesQuerySchema,
  updateWebhookEndpointSchema,
  webhookEndpointParamsSchema,
} from "../src/modules/webhooks/webhook.validation";

jest.mock("../src/modules/webhooks/webhook.service");

const organisationId = "550e8400-e29b-41d4-a716-446655440000";
const userId = "770e8400-e29b-41d4-a716-446655440002";
const webhookEndpointId = "99999999-9999-4999-8999-999999999999";
const roleId = "44444444-4444-4444-8444-444444444444";

const sampleEndpoint = {
  id: webhookEndpointId,
  organisationId,
  name: "Production webhook",
  url: "https://example.com/webhooks/flowops",
  events: ["workflow.request.submitted"],
  isActive: true,
  createdAt: "2026-07-07T12:00:00.000Z",
  updatedAt: "2026-07-07T12:00:00.000Z",
  createdBy: {
    id: userId,
    firstName: "Test",
    lastName: "User",
    email: "test.user@flowops.local",
  },
};

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
      name: "Admin",
    },
  };
  next();
}

function createWebhooksTestApp(permissions: string[]): Express {
  const app = express();
  app.use(express.json());

  const lookupPermissions = async (_roleId: string) => permissions;
  const router = Router();

  router.use(attachTestContext);

  router.get(
    "/",
    createRequirePermissionMiddleware(["webhooks:manage"], lookupPermissions),
    listWebhookEndpointsController,
  );

  router.post(
    "/",
    createRequirePermissionMiddleware(["webhooks:manage"], lookupPermissions),
    validateRequest({ body: createWebhookEndpointSchema }),
    createWebhookEndpointController,
  );

  router.get(
    "/:id",
    createRequirePermissionMiddleware(["webhooks:manage"], lookupPermissions),
    validateRequest({ params: webhookEndpointParamsSchema }),
    getWebhookEndpointController,
  );

  router.patch(
    "/:id",
    createRequirePermissionMiddleware(["webhooks:manage"], lookupPermissions),
    validateRequest({
      params: webhookEndpointParamsSchema,
      body: updateWebhookEndpointSchema,
    }),
    updateWebhookEndpointController,
  );

  router.delete(
    "/:id",
    createRequirePermissionMiddleware(["webhooks:manage"], lookupPermissions),
    validateRequest({ params: webhookEndpointParamsSchema }),
    deleteWebhookEndpointController,
  );

  router.get(
    "/:id/deliveries",
    createRequirePermissionMiddleware(["webhooks:manage"], lookupPermissions),
    validateRequest({
      params: webhookEndpointParamsSchema,
      query: listWebhookDeliveriesQuerySchema,
    }),
    listWebhookDeliveriesController,
  );

  app.use("/webhooks", router);
  app.use(errorHandler(logger));

  return app;
}

describe("webhook routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a webhook endpoint for users with webhooks:manage", async () => {
    const app = createWebhooksTestApp(["webhooks:manage"]);
    const created = {
      ...sampleEndpoint,
      secret: "whsec_test_secret",
    };

    jest.mocked(webhookService.createWebhookEndpoint).mockResolvedValue(created);

    const response = await request(app)
      .post("/webhooks")
      .send({
        name: "Production webhook",
        url: "https://example.com/webhooks/flowops",
        events: ["workflow.request.submitted"],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.secret).toBe("whsec_test_secret");
    expect(webhookService.createWebhookEndpoint).toHaveBeenCalledWith(
      organisationId,
      userId,
      {
        name: "Production webhook",
        url: "https://example.com/webhooks/flowops",
        events: ["workflow.request.submitted"],
      },
    );
  });

  it("lists webhook endpoints", async () => {
    const app = createWebhooksTestApp(["webhooks:manage"]);

    jest.mocked(webhookService.listWebhookEndpoints).mockResolvedValue([sampleEndpoint]);

    const response = await request(app).get("/webhooks");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe("Production webhook");
  });

  it("updates a webhook endpoint", async () => {
    const app = createWebhooksTestApp(["webhooks:manage"]);

    jest.mocked(webhookService.updateWebhookEndpoint).mockResolvedValue({
      ...sampleEndpoint,
      isActive: false,
    });

    const response = await request(app)
      .patch(`/webhooks/${webhookEndpointId}`)
      .send({ isActive: false });

    expect(response.status).toBe(200);
    expect(response.body.data.isActive).toBe(false);
  });

  it("lists webhook deliveries for an endpoint", async () => {
    const app = createWebhooksTestApp(["webhooks:manage"]);

    jest.mocked(webhookService.listWebhookDeliveries).mockResolvedValue([
      {
        id: "delivery-1",
        webhookEndpointId,
        eventType: "workflow.request.submitted",
        payload: { type: "workflow.request.submitted" },
        status: "PENDING",
        responseStatus: null,
        responseBody: null,
        attempts: 0,
        nextAttemptAt: null,
        deliveredAt: null,
        createdAt: "2026-07-07T12:05:00.000Z",
      },
    ]);

    const response = await request(app).get(`/webhooks/${webhookEndpointId}/deliveries`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].status).toBe("PENDING");
  });

  it("returns 403 without webhooks:manage permission", async () => {
    const app = createWebhooksTestApp(["settings:view"]);

    jest
      .mocked(webhookService.createWebhookEndpoint)
      .mockRejectedValue(new AuthorizationError("Forbidden"));

    const response = await request(app)
      .post("/webhooks")
      .send({
        name: "Production webhook",
        url: "https://example.com/webhooks/flowops",
        events: ["workflow.request.submitted"],
      });

    expect(response.status).toBe(403);
  });
});
