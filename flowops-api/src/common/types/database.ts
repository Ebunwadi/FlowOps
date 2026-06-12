import type { PrismaClient } from "../../generated/prisma/client";

/** Delegates required for organisation and role provisioning. */
export type DbClient = Pick<
  PrismaClient,
  "organisation" | "organisationMember" | "role" | "rolePermission" | "permission"
>;
