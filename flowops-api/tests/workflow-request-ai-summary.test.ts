import express, { Router, type Express } from "express";
import request from "supertest";

import { AuthorizationError, NotFoundError } from "../src/common/errors/httpErrors";
import { errorHandler } from "../src/common/middleware/errorHandler";
import { validateRequest } from "../src/common/middleware/validateRequest";
import { logger } from "../src/config/logger";
import { MembershipStatus } from "../src/generated/prisma/client";
import * as aiService from "../src/modules/ai/ai.service";
import { generateWorkflowRequestSummaryController } from "../src/modules/workflow-requests/workflow-request.controller";
import { workflowRequestParamsSchema } from "../src/modules/workflow-requests/workflow-request.validation";

jest.mock("../src/modules/ai/ai.service");

const organisationId = "550e8400-e29b-41d4-a716-446655440000";
const userId = "770e8400-e29b-41d4-a716-446655440002";
const workflowRequestId = "aaaa9999-9999-4999-8999-999999999999";
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

function createWorkflowRequestSummaryTestApp(): Express {
  const app = express();
  app.use(express.json());

  const router = Router();
  router.use(attachTestContext);
  router.post(
    "/:id/ai-summary",
    validateRequest({ params: workflowRequestParamsSchema }),
    generateWorkflowRequestSummaryController,
  );

  app.use("/api/workflow-requests", router);
  app.use(errorHandler(logger));
  return app;
}

describe("Workflow request AI summary API", () => {
  const app = createWorkflowRequestSummaryTestApp();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(aiService.generateWorkflowRequestSummary).mockResolvedValue({
      summary:
        "This equipment request was submitted by Ebube for a new laptop and is awaiting manager approval.",
    });
  });

  it("returns a generated summary for an accessible request", async () => {
    const response = await request(app).post(
      `/api/workflow-requests/${workflowRequestId}/ai-summary`,
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.summary).toContain("equipment request");
    expect(aiService.generateWorkflowRequestSummary).toHaveBeenCalledWith(
      organisationId,
      { userId, roleId },
      workflowRequestId,
    );
  });

  it("returns 404 when the request does not exist in the organisation", async () => {
    jest
      .mocked(aiService.generateWorkflowRequestSummary)
      .mockRejectedValue(new NotFoundError("Workflow request not found"));

    const response = await request(app).post(
      `/api/workflow-requests/${workflowRequestId}/ai-summary`,
    );

    expect(response.status).toBe(404);
  });

  it("returns 403 when the viewer cannot access the request", async () => {
    jest
      .mocked(aiService.generateWorkflowRequestSummary)
      .mockRejectedValue(
        new AuthorizationError(
          "You do not have permission to view this workflow request",
        ),
      );

    const response = await request(app).post(
      `/api/workflow-requests/${workflowRequestId}/ai-summary`,
    );

    expect(response.status).toBe(403);
  });
});
