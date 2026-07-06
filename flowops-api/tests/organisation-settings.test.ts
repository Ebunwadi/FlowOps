import express, { Router, type Express } from "express";
import request from "supertest";

import { errorHandler } from "../src/common/middleware/errorHandler";
import { createRequirePermissionMiddleware } from "../src/common/middleware/requirePermission";
import { validateRequest } from "../src/common/middleware/validateRequest";
import { logger } from "../src/config/logger";
import { MembershipStatus } from "../src/generated/prisma/client";
import {
  getOrganisationSettingsController,
  updateOrganisationSettingsController,
} from "../src/modules/organisation-settings/organisation-settings.controller";
import * as organisationSettingsService from "../src/modules/organisation-settings/organisation-settings.service";
import { updateOrganisationSettingsSchema } from "../src/modules/organisation-settings/organisation-settings.validation";

jest.mock("../src/modules/organisation-settings/organisation-settings.service");

const organisationId = "550e8400-e29b-41d4-a716-446655440000";
const userId = "770e8400-e29b-41d4-a716-446655440002";
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

function createOrganisationSettingsTestApp(permissions: string[]): Express {
  const app = express();
  app.use(express.json());

  const lookupPermissions = async (_roleId: string) => permissions;
  const router = Router();

  router.use(attachTestContext);

  router.get(
    "/",
    createRequirePermissionMiddleware(["settings:view"], lookupPermissions),
    getOrganisationSettingsController,
  );

  router.patch(
    "/",
    createRequirePermissionMiddleware(["settings:update"], lookupPermissions),
    validateRequest({ body: updateOrganisationSettingsSchema }),
    updateOrganisationSettingsController,
  );

  app.use("/api/organisation-settings", router);
  app.use(errorHandler(logger));
  return app;
}

describe("Organisation settings API", () => {
  const settingsResponse = {
    id: "settings-1",
    organisationId,
    allowAiFeatures: true,
    allowWebhooks: true,
    allowApiKeys: true,
    defaultSlaHours: null,
    requireCommentsOnReject: true,
    createdAt: "2026-07-06T12:00:00.000Z",
    updatedAt: "2026-07-06T12:00:00.000Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(organisationSettingsService.getOrganisationSettings)
      .mockResolvedValue(settingsResponse);
    jest
      .mocked(organisationSettingsService.updateOrganisationSettings)
      .mockResolvedValue({
        ...settingsResponse,
        allowAiFeatures: false,
        updatedAt: "2026-07-06T13:00:00.000Z",
      });
  });

  describe("GET /api/organisation-settings", () => {
    it("returns organisation settings when user has settings:view", async () => {
      const app = createOrganisationSettingsTestApp(["settings:view"]);

      const response = await request(app).get("/api/organisation-settings");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(settingsResponse);
      expect(
        organisationSettingsService.getOrganisationSettings,
      ).toHaveBeenCalledWith(organisationId);
    });

    it("returns 403 when user lacks settings:view", async () => {
      const app = createOrganisationSettingsTestApp([]);

      const response = await request(app).get("/api/organisation-settings");

      expect(response.status).toBe(403);
      expect(
        organisationSettingsService.getOrganisationSettings,
      ).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /api/organisation-settings", () => {
    it("updates organisation settings when user has settings:update", async () => {
      const app = createOrganisationSettingsTestApp(["settings:update"]);

      const response = await request(app)
        .patch("/api/organisation-settings")
        .send({ allowAiFeatures: false });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.allowAiFeatures).toBe(false);
      expect(
        organisationSettingsService.updateOrganisationSettings,
      ).toHaveBeenCalledWith(organisationId, { allowAiFeatures: false });
    });

    it("returns 403 when user lacks settings:update", async () => {
      const app = createOrganisationSettingsTestApp(["settings:view"]);

      const response = await request(app)
        .patch("/api/organisation-settings")
        .send({ allowAiFeatures: false });

      expect(response.status).toBe(403);
      expect(
        organisationSettingsService.updateOrganisationSettings,
      ).not.toHaveBeenCalled();
    });

    it("returns 400 when no settings fields are provided", async () => {
      const app = createOrganisationSettingsTestApp(["settings:update"]);

      const response = await request(app)
        .patch("/api/organisation-settings")
        .send({});

      expect(response.status).toBe(400);
      expect(
        organisationSettingsService.updateOrganisationSettings,
      ).not.toHaveBeenCalled();
    });
  });
});
