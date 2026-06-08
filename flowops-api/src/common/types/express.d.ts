import "express-serve-static-core";

import type { AuthenticatedUser } from "../../auth/types";

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthenticatedUser;
  }

  interface Locals {
    requestId?: string;
  }
}
