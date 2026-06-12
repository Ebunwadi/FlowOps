import type { DbClient } from "../../common/types/database";
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
