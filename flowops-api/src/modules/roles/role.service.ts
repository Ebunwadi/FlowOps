import type { DbClient } from "../../common/types/database";
import { logger } from "../../config/logger";
import {
  DEFAULT_ORGANISATION_ROLES,
} from "./default-roles";
import { findPermissionsByKeys } from "./role.repository";
import type { CreatedDefaultRoles } from "./role.types";

export class MissingPermissionsError extends Error {
  public constructor(missingKeys: string[]) {
    super(
      `Missing seeded permissions: ${missingKeys.join(", ")}. Run npm run db:seed before creating organisations.`,
    );
    this.name = "MissingPermissionsError";
  }
}

/**
 * Creates the five default org roles and attaches permissions within a transaction.
 */
export async function createDefaultRolesForOrganisation(
  organisationId: string,
  db: DbClient,
): Promise<CreatedDefaultRoles> {
  const permissionKeys = [
    ...new Set(DEFAULT_ORGANISATION_ROLES.flatMap((role) => role.permissions)),
  ];

  const permissions = await findPermissionsByKeys(permissionKeys, db);
  const permissionIdByKey = new Map(permissions.map((permission) => [permission.key, permission.id]));

  const missingKeys = permissionKeys.filter((key) => !permissionIdByKey.has(key));

  if (missingKeys.length > 0) {
    throw new MissingPermissionsError(missingKeys);
  }

  const createdRoles = {} as CreatedDefaultRoles;

  for (const roleDefinition of DEFAULT_ORGANISATION_ROLES) {
    const role = await db.role.create({
      data: {
        organisationId,
        name: roleDefinition.name,
        description: roleDefinition.description,
        isSystemRole: true,
      },
    });

    await db.rolePermission.createMany({
      data: roleDefinition.permissions.map((permissionKey) => ({
        roleId: role.id,
        permissionId: permissionIdByKey.get(permissionKey)!,
      })),
    });

    createdRoles[roleDefinition.name] = role;
  }

  logger.info(
    {
      origin: "api",
      event: "roles.created",
      organisationId,
      roleCount: DEFAULT_ORGANISATION_ROLES.length,
    },
    `[API] Default roles created for organisation ${organisationId}`,
  );

  return createdRoles;
}
