import { Router } from "express";

import { authenticate } from "../../common/middleware/authenticate";
import { ensureLocalUser } from "../../common/middleware/ensureLocalUser";
import { ensureOrganisationContext } from "../../common/middleware/ensureOrganisationContext";
import { requirePermission } from "../../common/middleware/requirePermission";
import { validateRequest } from "../../common/middleware/validateRequest";
import {
  getOrganisationSettingsController,
  updateOrganisationSettingsController,
} from "./organisation-settings.controller";
import { updateOrganisationSettingsSchema } from "./organisation-settings.validation";

export const organisationSettingsRouter = Router();

organisationSettingsRouter.use(authenticate, ensureLocalUser);

organisationSettingsRouter.get(
  "/",
  ensureOrganisationContext,
  requirePermission("settings:view"),
  getOrganisationSettingsController,
);

organisationSettingsRouter.patch(
  "/",
  ensureOrganisationContext,
  requirePermission("settings:update"),
  validateRequest({ body: updateOrganisationSettingsSchema }),
  updateOrganisationSettingsController,
);
