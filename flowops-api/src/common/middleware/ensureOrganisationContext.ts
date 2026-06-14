import type { IncomingHttpHeaders } from "node:http";

import type { NextFunction, Request, RequestHandler, Response } from "express";
import { z } from "zod";

import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
} from "../errors/httpErrors";
import { findActiveMembershipForUserInOrganisation } from "../../modules/organisations/organisation.repository";
import type { RequestOrganisationMembership } from "../../modules/organisations/organisation-context.types";
import { asyncHandler } from "./asyncHandler";

export const ORGANISATION_ID_HEADER = "x-organisation-id";

const organisationIdSchema = z.string().uuid();

type MembershipLookup = (
  userId: string,
  organisationId: string,
) => ReturnType<typeof findActiveMembershipForUserInOrganisation>;

function readOrganisationIdHeader(headers: IncomingHttpHeaders): string | undefined {
  const rawValue = headers[ORGANISATION_ID_HEADER];

  if (typeof rawValue !== "string") {
    return undefined;
  }

  const trimmed = rawValue.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toRequestMembership(
  membership: NonNullable<
    Awaited<ReturnType<typeof findActiveMembershipForUserInOrganisation>>
  >,
): RequestOrganisationMembership {
  return {
    id: membership.id,
    userId: membership.userId,
    organisationId: membership.organisationId,
    roleId: membership.roleId,
    status: membership.status,
    joinedAt: membership.joinedAt,
    role: membership.role,
  };
}

export function createEnsureOrganisationContextMiddleware(
  lookupMembership: MembershipLookup = findActiveMembershipForUserInOrganisation,
): RequestHandler {
  return asyncHandler(
    async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
      if (!req.localUser) {
        throw new AuthenticationError();
      }

      const organisationId = readOrganisationIdHeader(req.headers);

      if (!organisationId) {
        throw new ValidationError(
          `Organisation context is required (${ORGANISATION_ID_HEADER} header)`,
        );
      }

      if (!organisationIdSchema.safeParse(organisationId).success) {
        throw new ValidationError("Invalid organisation id");
      }

      const membership = await lookupMembership(req.localUser.id, organisationId);

      if (!membership) {
        throw new AuthorizationError("You do not belong to this organisation");
      }

      req.organisation = membership.organisation;
      req.membership = toRequestMembership(membership);
      next();
    },
  );
}

/**
 * Resolves tenant context from the `x-organisation-id` header and verifies the
 * authenticated user has an active membership. Must run after `ensureLocalUser`.
 */
export const ensureOrganisationContext = createEnsureOrganisationContextMiddleware();

/** Alias matching issue/route examples (`requireOrganisation`). */
export const requireOrganisation = ensureOrganisationContext;
