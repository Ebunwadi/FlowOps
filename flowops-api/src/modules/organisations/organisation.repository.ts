import type { DbClient } from "../../common/types/database";
import { prisma } from "../../config/database";
import { MembershipStatus, type Organisation } from "../../generated/prisma/client";

export interface OrganisationMembershipWithRelations {
  id: string;
  userId: string;
  organisationId: string;
  roleId: string;
  status: MembershipStatus;
  joinedAt: Date;
  organisation: Organisation;
  role: {
    id: string;
    name: string;
  };
}

export async function findActiveMembershipsForUser(
  userId: string,
  db: DbClient = prisma,
): Promise<OrganisationMembershipWithRelations[]> {
  return db.organisationMember.findMany({
    where: {
      userId,
      status: MembershipStatus.ACTIVE,
    },
    include: {
      organisation: true,
      role: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      joinedAt: "desc",
    },
  }) as Promise<OrganisationMembershipWithRelations[]>;
}

export async function findActiveMembershipForUserInOrganisation(
  userId: string,
  organisationId: string,
  db: DbClient = prisma,
): Promise<OrganisationMembershipWithRelations | null> {
  return db.organisationMember.findFirst({
    where: {
      userId,
      organisationId,
      status: MembershipStatus.ACTIVE,
    },
    include: {
      organisation: true,
      role: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  }) as Promise<OrganisationMembershipWithRelations | null>;
}

export async function updateOrganisationById(
  organisationId: string,
  data: Partial<Pick<Organisation, "name" | "slug">>,
  db: DbClient = prisma,
): Promise<Organisation> {
  return db.organisation.update({
    where: { id: organisationId },
    data,
  });
}
