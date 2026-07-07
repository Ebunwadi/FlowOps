import express, { Router, type Express } from "express";
import request from "supertest";

import { errorHandler } from "../src/common/middleware/errorHandler";
import { createRequirePermissionMiddleware } from "../src/common/middleware/requirePermission";
import { validateRequest } from "../src/common/middleware/validateRequest";
import { logger } from "../src/config/logger";
import { MembershipStatus } from "../src/generated/prisma/client";
import {
  exportRequestsCsvController,
  exportRequestsPdfController,
} from "../src/modules/reports/reports.controller";
import * as reportsExportService from "../src/modules/reports/reports.export.service";
import { reportsSummaryQuerySchema } from "../src/modules/reports/reports.validation";

jest.mock("../src/modules/reports/reports.export.service");

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

function createReportsExportTestApp(permissions: string[]): Express {
  const app = express();
  app.use(express.json());

  const lookupPermissions = async (_roleId: string) => permissions;
  const router = Router();

  router.use(attachTestContext);

  router.get(
    "/requests.csv",
    createRequirePermissionMiddleware(["reports:export"], lookupPermissions),
    validateRequest({ query: reportsSummaryQuerySchema }),
    exportRequestsCsvController,
  );

  router.get(
    "/requests.pdf",
    createRequirePermissionMiddleware(["reports:export"], lookupPermissions),
    validateRequest({ query: reportsSummaryQuerySchema }),
    exportRequestsPdfController,
  );

  app.use("/api/reports", router);
  app.use(errorHandler(logger));
  return app;
}

describe("reports export API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(reportsExportService.buildRequestsCsvExport).mockResolvedValue({
      fileName: "workflow-requests-report-2026-07-07.csv",
      content: Buffer.from("Request ID,Title\nreq-1,Test", "utf-8"),
      contentType: "text/csv; charset=utf-8",
    });
    jest.mocked(reportsExportService.buildRequestsPdfExport).mockResolvedValue({
      fileName: "workflow-requests-report-2026-07-07.pdf",
      content: Buffer.from("%PDF-1.4 test"),
      contentType: "application/pdf",
    });
  });

  it("exports CSV for users with reports:export", async () => {
    const app = createReportsExportTestApp(["reports:export"]);

    const response = await request(app).get("/api/reports/requests.csv").expect(200);

    expect(reportsExportService.buildRequestsCsvExport).toHaveBeenCalledWith(
      organisationId,
      "FlowOps Demo Organisation",
      {},
    );
    expect(response.headers["content-type"]).toContain("text/csv");
    expect(response.text).toContain("Request ID,Title");
  });

  it("exports PDF for users with reports:export", async () => {
    const app = createReportsExportTestApp(["reports:export"]);

    const response = await request(app).get("/api/reports/requests.pdf").buffer(true).expect(200);

    expect(reportsExportService.buildRequestsPdfExport).toHaveBeenCalledWith(
      organisationId,
      "FlowOps Demo Organisation",
      {},
    );
    expect(response.headers["content-type"]).toBe("application/pdf");
    expect(response.body.toString("utf-8")).toContain("%PDF-1.4");
  });

  it("rejects export for users without reports:export", async () => {
    const app = createReportsExportTestApp(["reports:view"]);

    const response = await request(app).get("/api/reports/requests.csv").expect(403);

    expect(response.body.success).toBe(false);
    expect(reportsExportService.buildRequestsCsvExport).not.toHaveBeenCalled();
  });
});
