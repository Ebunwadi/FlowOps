import "express-serve-static-core";

import type { AuthenticatedUser } from "../../auth/types";
import type { User } from "../../generated/prisma/client";

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthenticatedUser;
    /** Local FlowOps user profile synced from Keycloak. */
    localUser?: User;
  }

  interface Locals {
    requestId?: string;
  }
}
