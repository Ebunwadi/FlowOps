import { Router } from "express";

import { authenticate } from "../../common/middleware/authenticate";
import { ensureLocalUser } from "../../common/middleware/ensureLocalUser";
import { ensureOrganisationContext } from "../../common/middleware/ensureOrganisationContext";
import { validateRequest } from "../../common/middleware/validateRequest";
import {
  createOutOfOfficeRuleController,
  listOutOfOfficeRulesController,
  updateOutOfOfficeRuleController,
} from "./out-of-office.controller";
import {
  createOutOfOfficeRuleSchema,
  outOfOfficeRuleParamsSchema,
  updateOutOfOfficeRuleSchema,
} from "./out-of-office.validation";

export const outOfOfficeRouter = Router();

outOfOfficeRouter.use(authenticate, ensureLocalUser, ensureOrganisationContext);

outOfOfficeRouter.get("/", listOutOfOfficeRulesController);

outOfOfficeRouter.post(
  "/",
  validateRequest({ body: createOutOfOfficeRuleSchema }),
  createOutOfOfficeRuleController,
);

outOfOfficeRouter.patch(
  "/:id",
  validateRequest({
    params: outOfOfficeRuleParamsSchema,
    body: updateOutOfOfficeRuleSchema,
  }),
  updateOutOfOfficeRuleController,
);
