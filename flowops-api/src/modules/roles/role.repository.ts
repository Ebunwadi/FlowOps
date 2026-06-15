import type { DbClient } from "../../common/types/database";
import { prisma } from "../../config/database";
import type { Permission } from "../../generated/prisma/client";

export async function findPermissionsByKeys(
  keys: string[],
  db: DbClient,
): Promise<Permission[]> {
  return db.permission.findMany({
    where: {
      key: { in: keys },
    },
  });
}

export async function findPermissionKeysByRoleId(
  roleId: string,
  db: DbClient = prisma,
): Promise<string[]> {
  const rolePermissions = await db.rolePermission.findMany({
    where: { roleId },
    select: {
      permission: {
        select: {
          key: true,
        },
      },
    },
  });

  return rolePermissions.map((entry) => entry.permission.key);
}

export async function findRolesByOrganisationId(
  organisationId: string,
  db: DbClient = prisma,
) {
  return db.role.findMany({
    where: { organisationId },
    select: {
      id: true,
      name: true,
      description: true,
      isSystemRole: true,
    },
    orderBy: { name: "asc" },
  });
}
