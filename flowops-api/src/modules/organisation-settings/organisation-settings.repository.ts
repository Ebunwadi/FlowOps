import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import { DEFAULT_ORGANISATION_SETTINGS } from "./organisation-settings.defaults";

type TransactionClient = Prisma.TransactionClient;

export async function findOrganisationSettingsByOrganisationId(
  organisationId: string,
  client: TransactionClient | typeof prisma = prisma,
) {
  return client.organisationSettings.findUnique({
    where: { organisationId },
  });
}

export async function createOrganisationSettings(
  organisationId: string,
  client: TransactionClient | typeof prisma = prisma,
) {
  return client.organisationSettings.create({
    data: {
      organisationId,
      ...DEFAULT_ORGANISATION_SETTINGS,
    },
  });
}

export async function updateOrganisationSettingsByOrganisationId(
  organisationId: string,
  data: Prisma.OrganisationSettingsUpdateInput,
) {
  return prisma.organisationSettings.update({
    where: { organisationId },
    data,
  });
}
