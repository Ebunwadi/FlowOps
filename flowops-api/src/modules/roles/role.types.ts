import type { Role } from "../../generated/prisma/client";

import type { DefaultRoleName } from "./default-roles";

export type CreatedDefaultRoles = Record<DefaultRoleName, Role>;
