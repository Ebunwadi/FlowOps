import { Router } from "express";

import { authenticate } from "../../common/middleware/authenticate";
import { ensureLocalUser } from "../../common/middleware/ensureLocalUser";
import { ensureOrganisationContext } from "../../common/middleware/ensureOrganisationContext";
import { requirePermission } from "../../common/middleware/requirePermission";
import { validateRequest } from "../../common/middleware/validateRequest";
import { listPendingApprovalsController } from "./approval.controller";
import { listPendingApprovalsQuerySchema } from "./approval.validation";

export const approvalRouter = Router();

approvalRouter.use(authenticate, ensureLocalUser);

approvalRouter.get(
  "/pending",
  ensureOrganisationContext,
  requirePermission("approvals:view"),
  validateRequest({ query: listPendingApprovalsQuerySchema }),
  listPendingApprovalsController,
);
