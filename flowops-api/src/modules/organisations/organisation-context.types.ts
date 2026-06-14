import type { MembershipStatus, Organisation } from "../../generated/prisma/client";

/** Active membership attached to the request by organisation context middleware. */
export interface RequestOrganisationMembership {
  id: string;
  userId: string;
  organisationId: string;
  roleId: string;
  status: MembershipStatus;
  joinedAt: Date;
  role: {
    id: string;
    name: string;
  };
}

export type RequestOrganisation = Organisation;
