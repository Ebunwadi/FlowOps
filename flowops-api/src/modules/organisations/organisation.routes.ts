import { Router } from "express";
import { z } from "zod";

import { authenticate } from "../../common/middleware/authenticate";
import { ensureLocalUser } from "../../common/middleware/ensureLocalUser";
import {
  ensureOrganisationContext,
  ensureOrganisationFromParam,
} from "../../common/middleware/ensureOrganisationContext";
import { requirePermission } from "../../common/middleware/requirePermission";
import { validateRequest } from "../../common/middleware/validateRequest";
import {
  listOrganisationMembersController,
  listOrganisationRolesController,
  removeOrganisationMemberController,
  updateOrganisationMemberRoleController,
} from "../members/member.controller";
import {
  organisationMemberParamsSchema,
  updateMemberRoleSchema,
} from "../members/member.validation";
import {
  createOrganisationController,
  getCurrentOrganisationController,
  getOrganisationAccessController,
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

organisationRouter.get("/access", ensureOrganisationContext, getOrganisationAccessController);

organisationRouter.get(
  "/:id/members",
  validateRequest({ params: organisationIdParamSchema }),
  ensureOrganisationFromParam,
  requirePermission("members:view"),
  listOrganisationMembersController,
);

organisationRouter.get(
  "/:id/roles",
  validateRequest({ params: organisationIdParamSchema }),
  ensureOrganisationFromParam,
  requirePermission("members:view"),
  listOrganisationRolesController,
);

organisationRouter.patch(
  "/:id/members/:memberId/role",
  validateRequest({
    params: organisationMemberParamsSchema,
    body: updateMemberRoleSchema,
  }),
  ensureOrganisationFromParam,
  requirePermission("members:update-role"),
  updateOrganisationMemberRoleController,
);

organisationRouter.delete(
  "/:id/members/:memberId",
  validateRequest({ params: organisationMemberParamsSchema }),
  ensureOrganisationFromParam,
  requirePermission("members:remove"),
  removeOrganisationMemberController,
);

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
