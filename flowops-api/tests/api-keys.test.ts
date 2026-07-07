import express, { Router, type Express } from "express";
import request from "supertest";

import { AuthorizationError } from "../src/common/errors/httpErrors";
import { errorHandler } from "../src/common/middleware/errorHandler";
import { createRequirePermissionMiddleware } from "../src/common/middleware/requirePermission";
import { validateRequest } from "../src/common/middleware/validateRequest";
import { logger } from "../src/config/logger";
import { MembershipStatus } from "../src/generated/prisma/client";
import {
  createApiKeyController,
  listApiKeysController,
  revokeApiKeyController,
} from "../src/modules/api-keys/api-key.controller";
import * as apiKeyService from "../src/modules/api-keys/api-key.service";
import {
  apiKeyParamsSchema,
  createApiKeySchema,
} from "../src/modules/api-keys/api-key.validation";

jest.mock("../src/modules/api-keys/api-key.service");

const organisationId = "550e8400-e29b-41d4-a716-446655440000";
const userId = "770e8400-e29b-41d4-a716-446655440002";
const apiKeyId = "88888888-8888-4888-8888-888888888888";
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
      name: "Admin",
    },
  };
  next();
}

function createApiKeysTestApp(permissions: string[]): Express {
  const app = express();
  app.use(express.json());

  const lookupPermissions = async (_roleId: string) => permissions;
  const router = Router();

  router.use(attachTestContext);

  router.get(
    "/",
    createRequirePermissionMiddleware(["apikeys:manage"], lookupPermissions),
    listApiKeysController,
  );

  router.post(
    "/",
    createRequirePermissionMiddleware(["apikeys:manage"], lookupPermissions),
    validateRequest({ body: createApiKeySchema }),
    createApiKeyController,
  );

  router.delete(
    "/:id",
    createRequirePermissionMiddleware(["apikeys:manage"], lookupPermissions),
    validateRequest({ params: apiKeyParamsSchema }),
    revokeApiKeyController,
  );

  app.use("/api/api-keys", router);
  app.use(errorHandler(logger));
  return app;
}

describe("API keys API", () => {
  const apiKeyResponse = {
    id: apiKeyId,
    organisationId,
    name: "Integration key",
    keyPrefix: "flowops_live_abcd1234",
    scopes: null,
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
    createdAt: "2026-07-06T12:00:00.000Z",
    createdBy: {
      id: userId,
      firstName: "Test",
      lastName: "User",
      email: "test.user@flowops.local",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(apiKeyService.listApiKeys).mockResolvedValue([apiKeyResponse]);
    jest.mocked(apiKeyService.createApiKey).mockResolvedValue({
      ...apiKeyResponse,
      rawKey: "flowops_live_secretvalue123",
    });
    jest.mocked(apiKeyService.revokeApiKey).mockResolvedValue({
      ...apiKeyResponse,
      revokedAt: "2026-07-06T13:00:00.000Z",
    });
  });

  it("creates an API key for users with apikeys:manage", async () => {
    const app = createApiKeysTestApp(["apikeys:manage"]);

    const response = await request(app)
      .post("/api/api-keys")
      .send({ name: "Integration key" });

    expect(response.status).toBe(201);
    expect(response.body.data.rawKey).toBe("flowops_live_secretvalue123");
    expect(apiKeyService.createApiKey).toHaveBeenCalledWith(
      organisationId,
      userId,
      { name: "Integration key" },
    );
  });

  it("lists API keys without raw secrets", async () => {
    const app = createApiKeysTestApp(["apikeys:manage"]);

    const response = await request(app).get("/api/api-keys");

    expect(response.status).toBe(200);
    expect(response.body.data[0].keyPrefix).toBe("flowops_live_abcd1234");
    expect(response.body.data[0].rawKey).toBeUndefined();
  });

  it("revokes an API key", async () => {
    const app = createApiKeysTestApp(["apikeys:manage"]);

    const response = await request(app).delete(`/api/api-keys/${apiKeyId}`);

    expect(response.status).toBe(200);
    expect(response.body.data.revokedAt).not.toBeNull();
  });

  it("returns 403 without apikeys:manage permission", async () => {
    const app = createApiKeysTestApp(["settings:view"]);

    const response = await request(app).get("/api/api-keys");

    expect(response.status).toBe(403);
    expect(apiKeyService.listApiKeys).not.toHaveBeenCalled();
  });

  it("returns 403 when API keys are disabled for the organisation", async () => {
    const app = createApiKeysTestApp(["apikeys:manage"]);
    jest
      .mocked(apiKeyService.createApiKey)
      .mockRejectedValue(new AuthorizationError("API keys are disabled for this organisation"));

    const response = await request(app)
      .post("/api/api-keys")
      .send({ name: "Integration key" });

    expect(response.status).toBe(403);
  });
});
