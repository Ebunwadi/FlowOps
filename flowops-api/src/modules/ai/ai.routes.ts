import { Router } from "express";

import { authenticate } from "../../common/middleware/authenticate";
import { ensureLocalUser } from "../../common/middleware/ensureLocalUser";
import { ensureOrganisationContext } from "../../common/middleware/ensureOrganisationContext";
import { requirePermission } from "../../common/middleware/requirePermission";
import { validateRequest } from "../../common/middleware/validateRequest";
import { generateWorkflowSuggestionController } from "./ai.controller";
import { generateWorkflowSuggestionSchema } from "./ai.validation";

export const aiRouter = Router();

aiRouter.use(authenticate, ensureLocalUser);

aiRouter.post(
  "/workflows/generate",
  ensureOrganisationContext,
  requirePermission("workflows:create"),
  validateRequest({ body: generateWorkflowSuggestionSchema }),
  generateWorkflowSuggestionController,
);
