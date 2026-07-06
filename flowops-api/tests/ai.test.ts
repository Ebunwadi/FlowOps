import express, { Router, type Express } from "express";
import request from "supertest";

import { AuthorizationError } from "../src/common/errors/httpErrors";
import { errorHandler } from "../src/common/middleware/errorHandler";
import { createRequirePermissionMiddleware } from "../src/common/middleware/requirePermission";
import { validateRequest } from "../src/common/middleware/validateRequest";
import { logger } from "../src/config/logger";
import { MembershipStatus } from "../src/generated/prisma/client";
import { generateWorkflowSuggestionController } from "../src/modules/ai/ai.controller";
import * as aiService from "../src/modules/ai/ai.service";
import type { GeneratedWorkflowSuggestion } from "../src/modules/ai/ai.validation";
import { generateWorkflowSuggestionSchema } from "../src/modules/ai/ai.validation";

jest.mock("../src/modules/ai/ai.service");

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

function createAiTestApp(permissions: string[]): Express {
  const app = express();
  app.use(express.json());

  const lookupPermissions = async (_roleId: string) => permissions;
  const router = Router();

  router.use(attachTestContext);

  router.post(
    "/workflows/generate",
    createRequirePermissionMiddleware(["workflows:create"], lookupPermissions),
    validateRequest({ body: generateWorkflowSuggestionSchema }),
    generateWorkflowSuggestionController,
  );

  app.use("/api/ai", router);
  app.use(errorHandler(logger));
  return app;
}

describe("AI workflow generation API", () => {
  const suggestion: GeneratedWorkflowSuggestion = {
    name: "Equipment Request",
    description: "Used by staff to request work equipment.",
    category: "IT",
    fields: [
      {
        label: "Item requested",
        fieldKey: "item_requested",
        fieldType: "SHORT_TEXT",
        isRequired: true,
        fieldOrder: 1,
      },
    ],
    steps: [
      {
        name: "Manager Approval",
        stepOrder: 1,
        suggestedApproverRole: "Manager",
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(aiService.generateWorkflowSuggestion)
      .mockResolvedValue(suggestion);
  });

  it("returns a workflow suggestion for users with workflows:create", async () => {
    const app = createAiTestApp(["workflows:create"]);

    const response = await request(app)
      .post("/api/ai/workflows/generate")
      .send({
        prompt:
          "Create an equipment request workflow where staff submit the item needed.",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(suggestion);
    expect(aiService.generateWorkflowSuggestion).toHaveBeenCalledWith(
      organisationId,
      userId,
      {
        prompt:
          "Create an equipment request workflow where staff submit the item needed.",
      },
    );
  });

  it("returns 403 when user lacks workflows:create", async () => {
    const app = createAiTestApp(["workflows:view"]);

    const response = await request(app)
      .post("/api/ai/workflows/generate")
      .send({
        prompt:
          "Create an equipment request workflow where staff submit the item needed.",
      });

    expect(response.status).toBe(403);
    expect(aiService.generateWorkflowSuggestion).not.toHaveBeenCalled();
  });

  it("returns 400 when prompt is too short", async () => {
    const app = createAiTestApp(["workflows:create"]);

    const response = await request(app)
      .post("/api/ai/workflows/generate")
      .send({ prompt: "Too short" });

    expect(response.status).toBe(400);
    expect(aiService.generateWorkflowSuggestion).not.toHaveBeenCalled();
  });

  it("returns 403 when AI features are disabled for the organisation", async () => {
    const app = createAiTestApp(["workflows:create"]);
    jest
      .mocked(aiService.generateWorkflowSuggestion)
      .mockRejectedValue(
        new AuthorizationError("AI features are disabled for this organisation"),
      );

    const response = await request(app)
      .post("/api/ai/workflows/generate")
      .send({
        prompt:
          "Create an equipment request workflow where staff submit the item needed.",
      });

    expect(response.status).toBe(403);
  });
});
