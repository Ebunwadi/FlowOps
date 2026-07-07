import { Router } from "express";

import { authenticate } from "../../common/middleware/authenticate";
import { ensureLocalUser } from "../../common/middleware/ensureLocalUser";
import { ensureOrganisationContext } from "../../common/middleware/ensureOrganisationContext";
import { requirePermission } from "../../common/middleware/requirePermission";
import { validateRequest } from "../../common/middleware/validateRequest";
import {
  exportRequestsCsvController,
  exportRequestsPdfController,
  getReportsSummaryController,
} from "./reports.controller";
import { reportsSummaryQuerySchema } from "./reports.validation";

export const reportsRouter = Router();

reportsRouter.use(authenticate, ensureLocalUser);

reportsRouter.get(
  "/summary",
  ensureOrganisationContext,
  requirePermission("reports:view"),
  validateRequest({ query: reportsSummaryQuerySchema }),
  getReportsSummaryController,
);

reportsRouter.get(
  "/requests.csv",
  ensureOrganisationContext,
  requirePermission("reports:export"),
  validateRequest({ query: reportsSummaryQuerySchema }),
  exportRequestsCsvController,
);

reportsRouter.get(
  "/requests.pdf",
  ensureOrganisationContext,
  requirePermission("reports:export"),
  validateRequest({ query: reportsSummaryQuerySchema }),
  exportRequestsPdfController,
);
