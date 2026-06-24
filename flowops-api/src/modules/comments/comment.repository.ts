import type { DbClient } from "../../common/types/database";
import { prisma } from "../../config/database";

const commentSelect = {
  id: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} as const;

const requestForCommentAccessSelect = {
  id: true,
  requesterId: true,
  currentStep: {
    select: {
      approverRoleId: true,
    },
  },
} as const;

export async function findWorkflowRequestForCommentAccess(
  workflowRequestId: string,
  organisationId: string,
  db: DbClient = prisma,
) {
  return db.workflowRequest.findFirst({
    where: {
      id: workflowRequestId,
      organisationId,
    },
    select: requestForCommentAccessSelect,
  });
}

export async function findWorkflowRequestComments(
  workflowRequestId: string,
  db: DbClient = prisma,
) {
  return db.comment.findMany({
    where: { workflowRequestId },
    orderBy: { createdAt: "asc" },
    select: commentSelect,
  });
}

export interface CreateWorkflowRequestCommentInput {
  workflowRequestId: string;
  authorId: string;
  content: string;
}

export async function createWorkflowRequestComment(
  input: CreateWorkflowRequestCommentInput,
  db: DbClient = prisma,
) {
  return db.comment.create({
    data: {
      workflowRequestId: input.workflowRequestId,
      authorId: input.authorId,
      content: input.content,
    },
    select: commentSelect,
  });
}
