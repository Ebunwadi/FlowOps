import express, { Router, type Express } from "express";
import request from "supertest";

import { errorHandler } from "../src/common/middleware/errorHandler";
import { createRequirePermissionMiddleware } from "../src/common/middleware/requirePermission";
import { validateRequest } from "../src/common/middleware/validateRequest";
import { logger } from "../src/config/logger";
import { MembershipStatus, type WorkflowRequestStatus } from "../src/generated/prisma/client";
import { getReportsSummaryController } from "../src/modules/reports/reports.controller";
import * as reportsService from "../src/modules/reports/reports.service";
import { reportsSummaryQuerySchema } from "../src/modules/reports/reports.validation";

jest.mock("../src/modules/reports/reports.service");

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

function createReportsTestApp(permissions: string[]): Express {
  const app = express();
  app.use(express.json());

  const lookupPermissions = async (_roleId: string) => permissions;
  const router = Router();

  router.use(attachTestContext);

  router.get(
    "/summary",
    createRequirePermissionMiddleware(["reports:view"], lookupPermissions),
    validateRequest({ query: reportsSummaryQuerySchema }),
    getReportsSummaryController,
  );

  app.use("/api/reports", router);
  app.use(errorHandler(logger));
  return app;
}

describe("reports API", () => {
  const summaryResponse = {
    filters: {
      fromDate: null,
      toDate: null,
    },
    totalRequests: 8,
    pendingRequests: 2,
    completedRequests: 5,
    rejectedRequests: 1,
    averageApprovalTimeHours: 18,
    overdueRequests: 1,
    requestsByStatus: [
      { status: "APPROVED" as WorkflowRequestStatus, count: 5 },
      { status: "PENDING_APPROVAL" as WorkflowRequestStatus, count: 2 },
      { status: "REJECTED" as WorkflowRequestStatus, count: 1 },
    ],
    requestsByWorkflow: [
      {
        workflowTemplateId: "template-1",
        workflowName: "Equipment Request",
        count: 6,
      },
    ],
    requestsCreatedPerMonth: [{ month: "2026-06", count: 3 }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(reportsService.getReportsSummary).mockResolvedValue(summaryResponse);
  });

  it("returns summary metrics for users with reports:view", async () => {
    const app = createReportsTestApp(["reports:view"]);

    const response = await request(app).get("/api/reports/summary").expect(200);

    expect(reportsService.getReportsSummary).toHaveBeenCalledWith(organisationId, {});
    expect(response.body.data).toEqual(summaryResponse);
  });

  it("supports date filters on the summary endpoint", async () => {
    const app = createReportsTestApp(["reports:view"]);

    await request(app)
      .get("/api/reports/summary")
      .query({
        fromDate: "2026-06-01T00:00:00.000Z",
        toDate: "2026-06-30T23:59:59.000Z",
      })
      .expect(200);

    expect(reportsService.getReportsSummary).toHaveBeenCalledWith(
      organisationId,
      expect.objectContaining({
        fromDate: expect.any(Date),
        toDate: expect.any(Date),
      }),
    );
  });

  it("rejects users without reports:view permission", async () => {
    const app = createReportsTestApp(["requests:view-own"]);

    const response = await request(app).get("/api/reports/summary").expect(403);

    expect(response.body.success).toBe(false);
    expect(reportsService.getReportsSummary).not.toHaveBeenCalled();
  });
});
