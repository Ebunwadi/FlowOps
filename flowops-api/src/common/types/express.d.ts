import "express-serve-static-core";

import type { AuthenticatedUser } from "../../auth/types";
import type { User } from "../../generated/prisma/client";
import type { RequestApiKeyContext } from "../../modules/api-keys/api-key.types";
import type {
  RequestOrganisation,
  RequestOrganisationMembership,
} from "../../modules/organisations/organisation-context.types";

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthenticatedUser;
    /** Local FlowOps user profile synced from Keycloak. */
    localUser?: User;
    /** Active organisation resolved from `x-organisation-id` header. */
    organisation?: RequestOrganisation;
    /** User's active membership in `req.organisation`. */
    membership?: RequestOrganisationMembership;
    /** API key used for external authentication. */
    apiKey?: RequestApiKeyContext;
    /** Authentication method used for the current request. */
    authMethod?: "jwt" | "api-key";
  }

  interface Locals {
    requestId?: string;
  }
}
