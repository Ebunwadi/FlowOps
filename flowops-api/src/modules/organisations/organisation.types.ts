import type {
  Organisation,
  OrganisationMember,
} from "../../generated/prisma/client";

import type { CreatedDefaultRoles } from "../roles/role.types";

export interface CreateOrganisationInput {
  name: string;
  slug: string;
  createdById: string;
}

export interface CreateOrganisationResult {
  organisation: Organisation;
  membership: OrganisationMember;
  roles: CreatedDefaultRoles;
}
