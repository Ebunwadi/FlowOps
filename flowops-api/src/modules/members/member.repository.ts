import type { DbClient } from "../../common/types/database";
import { prisma } from "../../config/database";
import { MembershipStatus } from "../../generated/prisma/client";
import { DEFAULT_ROLE_NAMES } from "../roles/default-roles";

export interface OrganisationMemberWithUserAndRole {
  id: string;
  userId: string;
  organisationId: string;
  roleId: string;
  status: MembershipStatus;
  joinedAt: Date;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  role: {
    id: string;
    name: string;
  };
}

const memberInclude = {
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
  role: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

export async function findMembersByOrganisationId(
  organisationId: string,
  db: DbClient = prisma,
): Promise<OrganisationMemberWithUserAndRole[]> {
  return db.organisationMember.findMany({
    where: {
      organisationId,
      status: MembershipStatus.ACTIVE,
    },
    include: memberInclude,
    orderBy: {
      joinedAt: "asc",
    },
  }) as Promise<OrganisationMemberWithUserAndRole[]>;
}

export async function findMemberByIdInOrganisation(
  memberId: string,
  organisationId: string,
  db: DbClient = prisma,
): Promise<OrganisationMemberWithUserAndRole | null> {
  return db.organisationMember.findFirst({
    where: {
      id: memberId,
      organisationId,
      status: MembershipStatus.ACTIVE,
    },
    include: memberInclude,
  }) as Promise<OrganisationMemberWithUserAndRole | null>;
}

export async function findRoleByIdInOrganisation(
  roleId: string,
  organisationId: string,
  db: DbClient = prisma,
) {
  return db.role.findFirst({
    where: {
      id: roleId,
      organisationId,
    },
    select: {
      id: true,
      name: true,
      organisationId: true,
    },
  });
}

export async function countActiveOwnersInOrganisation(
  organisationId: string,
  db: DbClient = prisma,
): Promise<number> {
  return db.organisationMember.count({
    where: {
      organisationId,
      status: MembershipStatus.ACTIVE,
      role: {
        name: DEFAULT_ROLE_NAMES.OWNER,
      },
    },
  });
}

export async function updateMemberRoleById(
  memberId: string,
  roleId: string,
  db: DbClient = prisma,
): Promise<OrganisationMemberWithUserAndRole> {
  return db.organisationMember.update({
    where: { id: memberId },
    data: { roleId },
    include: memberInclude,
  }) as Promise<OrganisationMemberWithUserAndRole>;
}

export async function deleteMemberById(
  memberId: string,
  db: DbClient = prisma,
): Promise<void> {
  await db.organisationMember.delete({
    where: { id: memberId },
  });
}
