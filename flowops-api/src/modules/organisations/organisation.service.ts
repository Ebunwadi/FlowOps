import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { MembershipStatus } from "../../generated/prisma/client";
import { DEFAULT_ROLE_NAMES } from "../roles/default-roles";
import { createDefaultRolesForOrganisation } from "../roles/role.service";
import type {
  CreateOrganisationInput,
  CreateOrganisationResult,
} from "./organisation.types";

/**
 * Creates an organisation, seeds default roles with permissions, and assigns the
 * creator as Owner — all in a single transaction.
 */
export async function createOrganisation(
  input: CreateOrganisationInput,
): Promise<CreateOrganisationResult> {
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
}
