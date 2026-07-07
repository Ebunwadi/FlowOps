import { prisma } from "../../config/database";
import { MembershipStatus } from "../../generated/prisma/client";

const approvalDelegationSelect = {
  id: true,
  organisationId: true,
  workflowRequestId: true,
  workflowStepId: true,
  reason: true,
  createdAt: true,
  delegatedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  delegatedTo: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} as const;

export async function upsertApprovalDelegationRecord(input: {
  organisationId: string;
  workflowRequestId: string;
  workflowStepId: string;
  delegatedById: string;
  delegatedToId: string;
  reason?: string | null;
}) {
  return prisma.approvalDelegation.upsert({
    where: {
      workflowRequestId_workflowStepId: {
        workflowRequestId: input.workflowRequestId,
        workflowStepId: input.workflowStepId,
      },
    },
    create: {
      organisationId: input.organisationId,
      workflowRequestId: input.workflowRequestId,
      workflowStepId: input.workflowStepId,
      delegatedById: input.delegatedById,
      delegatedToId: input.delegatedToId,
      reason: input.reason ?? undefined,
    },
    update: {
      delegatedById: input.delegatedById,
      delegatedToId: input.delegatedToId,
      reason: input.reason ?? undefined,
    },
    select: approvalDelegationSelect,
  });
}

export async function findApprovalDelegationForRequestStep(
  workflowRequestId: string,
  workflowStepId: string,
) {
  return prisma.approvalDelegation.findUnique({
    where: {
      workflowRequestId_workflowStepId: {
        workflowRequestId,
        workflowStepId,
      },
    },
    select: approvalDelegationSelect,
  });
}

export async function findActiveDelegatedRequestIdsForUser(
  organisationId: string,
  userId: string,
) {
  const delegations = await prisma.approvalDelegation.findMany({
    where: {
      organisationId,
      delegatedToId: userId,
    },
    select: {
      workflowRequestId: true,
      workflowStepId: true,
      workflowRequest: {
        select: {
          status: true,
          currentStepId: true,
        },
      },
    },
  });

  return delegations
    .filter(
      (delegation) =>
        delegation.workflowRequest.status === "PENDING_APPROVAL" &&
        delegation.workflowRequest.currentStepId === delegation.workflowStepId,
    )
    .map((delegation) => delegation.workflowRequestId);
}

export async function findActiveOrganisationMemberByUserId(
  organisationId: string,
  userId: string,
) {
  return prisma.organisationMember.findFirst({
    where: {
      organisationId,
      userId,
      status: MembershipStatus.ACTIVE,
    },
    select: {
      id: true,
      userId: true,
      roleId: true,
    },
  });
}
