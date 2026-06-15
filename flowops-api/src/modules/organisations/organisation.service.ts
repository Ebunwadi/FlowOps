import { ConflictError, NotFoundError } from "../../common/errors/httpErrors";
import { findPermissionKeysByRoleId } from "../roles/role.repository";
import type { RequestOrganisationMembership } from "./organisation-context.types";
import { isPrismaUniqueConstraintError } from "../../common/utils/isPrismaUniqueConstraintError";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { MembershipStatus } from "../../generated/prisma/client";
import { DEFAULT_ROLE_NAMES } from "../roles/default-roles";
import { createDefaultRolesForOrganisation } from "../roles/role.service";
import {
  toOrganisationCreatedResponse,
  toOrganisationResponse,
  type OrganisationCreatedResponse,
  type OrganisationResponse,
} from "./organisation.mapper";
import {
  findActiveMembershipForUserInOrganisation,
  findActiveMembershipsForUser,
  updateOrganisationById,
} from "./organisation.repository";
import type {
  CreateOrganisationInput,
  CreateOrganisationResult,
} from "./organisation.types";
import type {
  CreateOrganisationBody,
  UpdateOrganisationBody,
} from "./organisation.validation";

/**
 * Creates an organisation, seeds default roles with permissions, and assigns the
 * creator as Owner — all in a single transaction.
 */
export async function createOrganisation(
  input: CreateOrganisationInput,
): Promise<CreateOrganisationResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const organisation = await tx.organisation.create({
        data: {
          name: input.name,
          slug: input.slug,
          createdById: input.createdById,
        },
      });

      const roles = await createDefaultRolesForOrganisation(organisation.id, tx);

      const membership = await tx.organisationMember.create({
        data: {
          userId: input.createdById,
          organisationId: organisation.id,
          roleId: roles[DEFAULT_ROLE_NAMES.OWNER].id,
          status: MembershipStatus.ACTIVE,
        },
      });

      return { organisation, membership, roles };
    });

    logger.info(
      {
        origin: "api",
        event: "organisation.created",
        organisationId: result.organisation.id,
        ownerUserId: input.createdById,
      },
      `[API] Organisation "${result.organisation.name}" created with default roles`,
    );

    return result;
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new ConflictError("An organisation with this slug already exists");
    }

    throw error;
  }
}

export async function createOrganisationForUser(
  userId: string,
  input: CreateOrganisationBody,
): Promise<OrganisationCreatedResponse> {
  const result = await createOrganisation({
    ...input,
    createdById: userId,
  });

  return toOrganisationCreatedResponse(
    result.organisation,
    result.roles[DEFAULT_ROLE_NAMES.OWNER].name,
  );
}

export interface OrganisationAccessResponse {
  membershipId: string;
  role: {
    id: string;
    name: string;
  };
  permissions: string[];
}

export async function getOrganisationAccessForMembership(
  membership: Pick<RequestOrganisationMembership, "id" | "roleId" | "role">,
): Promise<OrganisationAccessResponse> {
  const permissions = await findPermissionKeysByRoleId(membership.roleId);

  return {
    membershipId: membership.id,
    role: {
      id: membership.roleId,
      name: membership.role.name,
    },
    permissions,
  };
}

export async function listOrganisationsForUser(
  userId: string,
): Promise<OrganisationResponse[]> {
  const memberships = await findActiveMembershipsForUser(userId);

  return memberships.map((membership) =>
    toOrganisationResponse(membership.organisation, membership.role.name),
  );
}

export async function getCurrentOrganisationForUser(
  userId: string,
): Promise<OrganisationResponse> {
  const memberships = await findActiveMembershipsForUser(userId);
  const current = memberships[0];

  if (!current) {
    throw new NotFoundError("No organisation found for this user");
  }

  return toOrganisationResponse(current.organisation, current.role.name);
}

export async function getOrganisationByIdForUser(
  organisationId: string,
  userId: string,
): Promise<OrganisationResponse> {
  const membership = await findActiveMembershipForUserInOrganisation(
    userId,
    organisationId,
  );

  if (!membership) {
    throw new NotFoundError("Organisation not found");
  }

  return toOrganisationResponse(membership.organisation, membership.role.name);
}

export async function updateOrganisationForUser(
  organisationId: string,
  userId: string,
  input: UpdateOrganisationBody,
): Promise<OrganisationResponse> {
  const membership = await findActiveMembershipForUserInOrganisation(
    userId,
    organisationId,
  );

  if (!membership) {
    throw new NotFoundError("Organisation not found");
  }

  try {
    const organisation = await updateOrganisationById(organisationId, input);

    return toOrganisationResponse(organisation, membership.role.name);
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new ConflictError("An organisation with this slug already exists");
    }

    throw error;
  }
}
