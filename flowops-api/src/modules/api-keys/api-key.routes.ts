import { Router } from "express";

import { authenticate } from "../../common/middleware/authenticate";
import { ensureLocalUser } from "../../common/middleware/ensureLocalUser";
import { ensureOrganisationContext } from "../../common/middleware/ensureOrganisationContext";
import { requirePermission } from "../../common/middleware/requirePermission";
import { validateRequest } from "../../common/middleware/validateRequest";
import {
  createApiKeyController,
  listApiKeysController,
  revokeApiKeyController,
} from "./api-key.controller";
import {
  apiKeyParamsSchema,
  createApiKeySchema,
} from "./api-key.validation";

export const apiKeyRouter = Router();

apiKeyRouter.use(authenticate, ensureLocalUser);

apiKeyRouter.get(
  "/",
  ensureOrganisationContext,
  requirePermission("apikeys:manage"),
  listApiKeysController,
);

apiKeyRouter.post(
  "/",
  ensureOrganisationContext,
  requirePermission("apikeys:manage"),
  validateRequest({ body: createApiKeySchema }),
  createApiKeyController,
);

apiKeyRouter.delete(
  "/:id",
  ensureOrganisationContext,
  requirePermission("apikeys:manage"),
  validateRequest({ params: apiKeyParamsSchema }),
  revokeApiKeyController,
);
