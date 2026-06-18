import type { PrismaClient } from "../../generated/prisma/client";

/** Delegates required for organisation, role, and workflow provisioning. */
export type DbClient = Pick<
  PrismaClient,
  | "organisation"
  | "organisationMember"
  | "role"
  | "rolePermission"
  | "permission"
  | "workflowTemplate"
  | "workflowField"
  | "workflowStep"
>;
