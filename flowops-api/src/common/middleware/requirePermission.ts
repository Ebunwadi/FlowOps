import type { NextFunction, Request, RequestHandler, Response } from "express";

import { AuthorizationError, ValidationError } from "../errors/httpErrors";
import type { DefaultPermissionKey } from "../../modules/permissions/default-permissions";
import type { RequestOrganisationMembership } from "../../modules/organisations/organisation-context.types";
import { findPermissionKeysByRoleId } from "../../modules/roles/role.repository";
import { asyncHandler } from "./asyncHandler";

type PermissionKeysLookup = (roleId: string) => Promise<string[]>;

type PermissionMatchMode = "all" | "any";

interface RequirePermissionOptions {
  match?: PermissionMatchMode;
}

const rolePermissionCache = new WeakMap<Request, Set<string>>();

type RequestWithMembership = Request & {
  membership?: RequestOrganisationMembership;
};

async function loadRolePermissionKeys(
  req: Request,
  roleId: string,
  lookupPermissionKeys: PermissionKeysLookup,
): Promise<Set<string>> {
  const cached = rolePermissionCache.get(req);
  if (cached) {
    return cached;
  }

  const keys = await lookupPermissionKeys(roleId);
  const permissionKeys = new Set(keys);
  rolePermissionCache.set(req, permissionKeys);
  return permissionKeys;
}

function getRequestMembership(req: Request): RequestOrganisationMembership {
  const membership = (req as RequestWithMembership).membership;

  if (!membership) {
    throw new ValidationError(
      "Organisation context is required before checking permissions",
    );
  }

  return membership;
}

function evaluatePermissions(
  grantedKeys: Set<string>,
  requiredKeys: string[],
  match: PermissionMatchMode,
): boolean {
  if (requiredKeys.length === 0) {
    return true;
  }

  if (match === "any") {
    return requiredKeys.some((key) => grantedKeys.has(key));
  }

  return requiredKeys.every((key) => grantedKeys.has(key));
}

function formatMissingPermissionsMessage(
  requiredKeys: string[],
  match: PermissionMatchMode,
): string {
  if (match === "any") {
    return `Missing one of the required permissions: ${requiredKeys.join(", ")}`;
  }

  if (requiredKeys.length === 1) {
    return `Missing required permission: ${requiredKeys[0]}`;
  }

  return `Missing required permissions: ${requiredKeys.join(", ")}`;
}

export function createRequirePermissionMiddleware(
  requiredKeys: string[],
  lookupPermissionKeys: PermissionKeysLookup = findPermissionKeysByRoleId,
  options: RequirePermissionOptions = {},
): RequestHandler {
  const match = options.match ?? "all";

  return asyncHandler(
    async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
      const membership = getRequestMembership(req);

      const grantedKeys = await loadRolePermissionKeys(
        req,
        membership.roleId,
        lookupPermissionKeys,
      );

      if (!evaluatePermissions(grantedKeys, requiredKeys, match)) {
        throw new AuthorizationError(
          formatMissingPermissionsMessage(requiredKeys, match),
        );
      }

      next();
    },
  );
}

/**
 * Ensures the user's role in the current organisation includes every listed
 * permission. Must run after `ensureOrganisationContext`.
 */
export function requirePermission(
  ...permissionKeys: DefaultPermissionKey[]
): RequestHandler {
  return createRequirePermissionMiddleware(permissionKeys);
}

/**
 * Ensures the user's role includes at least one of the listed permissions.
 * Must run after `ensureOrganisationContext`.
 */
export function requireAnyPermission(
  ...permissionKeys: DefaultPermissionKey[]
): RequestHandler {
  return createRequirePermissionMiddleware(permissionKeys, findPermissionKeysByRoleId, {
    match: "any",
  });
}
