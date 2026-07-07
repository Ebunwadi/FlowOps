import type { DbClient } from "../../common/types/database";
import { prisma } from "../../config/database";
import { MembershipStatus } from "../../generated/prisma/client";

const outOfOfficeRuleSelect = {
  id: true,
  organisationId: true,
  userId: true,
  delegateToId: true,
  startsAt: true,
  endsAt: true,
  isActive: true,
  createdAt: true,
  delegateTo: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} as const;

export type OutOfOfficeRuleRecord = NonNullable<
  Awaited<ReturnType<typeof findOutOfOfficeRuleById>>
>;

export function isOutOfOfficeRuleCurrentlyActive(
  rule: {
    isActive: boolean;
    startsAt: Date;
    endsAt: Date;
  },
  now = new Date(),
): boolean {
  return rule.isActive && rule.startsAt <= now && rule.endsAt >= now;
}

export async function findOutOfOfficeRuleById(
  organisationId: string,
  ruleId: string,
  db: DbClient = prisma,
) {
  return db.outOfOfficeRule.findFirst({
    where: {
      id: ruleId,
      organisationId,
    },
    select: outOfOfficeRuleSelect,
  });
}

export async function findOutOfOfficeRulesForUser(
  organisationId: string,
  userId: string,
  db: DbClient = prisma,
) {
  return db.outOfOfficeRule.findMany({
    where: {
      organisationId,
      userId,
    },
    select: outOfOfficeRuleSelect,
    orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function createOutOfOfficeRuleRecord(input: {
  organisationId: string;
  userId: string;
  delegateToId: string;
  startsAt: Date;
  endsAt: Date;
  isActive?: boolean;
}) {
  return prisma.outOfOfficeRule.create({
    data: {
      organisationId: input.organisationId,
      userId: input.userId,
      delegateToId: input.delegateToId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      isActive: input.isActive ?? true,
    },
    select: outOfOfficeRuleSelect,
  });
}

export async function updateOutOfOfficeRuleRecord(
  ruleId: string,
  input: {
    delegateToId?: string;
    startsAt?: Date;
    endsAt?: Date;
    isActive?: boolean;
  },
) {
  return prisma.outOfOfficeRule.update({
    where: { id: ruleId },
    data: input,
    select: outOfOfficeRuleSelect,
  });
}

export async function findActiveOutOfOfficeRuleForUser(
  organisationId: string,
  userId: string,
  now = new Date(),
  db: DbClient = prisma,
) {
  const rules = await db.outOfOfficeRule.findMany({
    where: {
      organisationId,
      userId,
      isActive: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    select: outOfOfficeRuleSelect,
    orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
    take: 1,
  });

  return rules[0] ?? null;
}

export async function isActiveOutOfOfficeDelegateForRole(
  organisationId: string,
  delegateToId: string,
  approverRoleId: string,
  now = new Date(),
  db: DbClient = prisma,
): Promise<boolean> {
  const rule = await db.outOfOfficeRule.findFirst({
    where: {
      organisationId,
      delegateToId,
      isActive: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
      user: {
        organisationMemberships: {
          some: {
            organisationId,
            roleId: approverRoleId,
            status: MembershipStatus.ACTIVE,
          },
        },
      },
    },
    select: { id: true },
  });

  return rule !== null;
}

export async function findOutOfOfficeDelegatedPendingRequestIds(
  organisationId: string,
  delegateToId: string,
  now = new Date(),
  db: DbClient = prisma,
): Promise<string[]> {
  const rules = await db.outOfOfficeRule.findMany({
    where: {
      organisationId,
      delegateToId,
      isActive: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    select: {
      userId: true,
      user: {
        select: {
          organisationMemberships: {
            where: {
              organisationId,
              status: MembershipStatus.ACTIVE,
            },
            select: {
              roleId: true,
            },
          },
        },
      },
    },
  });

  const approverRoleIds: string[] = [
    ...new Set(
      rules.flatMap((rule: (typeof rules)[number]) =>
        rule.user.organisationMemberships.map(
          (membership: { roleId: string }) => membership.roleId,
        ),
      ),
    ),
  ];

  if (approverRoleIds.length === 0) {
    return [];
  }

  const requests = await db.workflowRequest.findMany({
    where: {
      organisationId,
      status: "PENDING_APPROVAL",
      currentStepId: { not: null },
      currentStep: {
        approverRoleId: { in: approverRoleIds },
      },
    },
    select: { id: true },
  });

  return requests.map((request) => request.id);
}

export interface OutOfOfficeReassignmentContext {
  workflowRequestId: string;
  outOfOfficeUser: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

export async function findOutOfOfficeReassignmentsForDelegate(
  organisationId: string,
  delegateToId: string,
  workflowRequestIds: string[],
  now = new Date(),
  db: DbClient = prisma,
): Promise<OutOfOfficeReassignmentContext[]> {
  if (workflowRequestIds.length === 0) {
    return [];
  }

  const rules = await db.outOfOfficeRule.findMany({
    where: {
      organisationId,
      delegateToId,
      isActive: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    select: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          organisationMemberships: {
            where: {
              organisationId,
              status: MembershipStatus.ACTIVE,
            },
            select: {
              roleId: true,
            },
          },
        },
      },
    },
  });

  if (rules.length === 0) {
    return [];
  }

  const requests = await db.workflowRequest.findMany({
    where: {
      id: { in: workflowRequestIds },
      organisationId,
      status: "PENDING_APPROVAL",
      currentStepId: { not: null },
    },
    select: {
      id: true,
      currentStep: {
        select: {
          approverRoleId: true,
        },
      },
    },
  });

  const reassignments: OutOfOfficeReassignmentContext[] = [];

  for (const request of requests) {
    if (!request.currentStep) {
      continue;
    }

    const matchingRule = rules.find((rule: (typeof rules)[number]) =>
      rule.user.organisationMemberships.some(
        (membership: { roleId: string }) =>
          membership.roleId === request.currentStep?.approverRoleId,
      ),
    );

    if (matchingRule) {
      reassignments.push({
        workflowRequestId: request.id,
        outOfOfficeUser: {
          id: matchingRule.user.id,
          firstName: matchingRule.user.firstName,
          lastName: matchingRule.user.lastName,
          email: matchingRule.user.email,
        },
      });
    }
  }

  return reassignments;
}
