import { Router } from "express";
import { z } from "zod";

import { authenticate } from "../../common/middleware/authenticate";
import { ensureLocalUser } from "../../common/middleware/ensureLocalUser";
import { validateRequest } from "../../common/middleware/validateRequest";
import {
  createOrganisationController,
  getCurrentOrganisationController,
  getOrganisationByIdController,
  listOrganisationsController,
  updateOrganisationController,
} from "./organisation.controller";
import {
  createOrganisationSchema,
  updateOrganisationSchema,
} from "./organisation.validation";

export const organisationRouter = Router();

const organisationIdParamSchema = z.object({
  id: z.string().uuid(),
});

organisationRouter.use(authenticate, ensureLocalUser);

organisationRouter.post(
  "/",
  validateRequest({ body: createOrganisationSchema }),
  createOrganisationController,
);

organisationRouter.get("/current", getCurrentOrganisationController);

organisationRouter.get("/", listOrganisationsController);

organisationRouter.get(
  "/:id",
  validateRequest({ params: organisationIdParamSchema }),
  getOrganisationByIdController,
);

organisationRouter.patch(
  "/:id",
  validateRequest({
    body: updateOrganisationSchema,
    params: organisationIdParamSchema,
  }),
  updateOrganisationController,
);
