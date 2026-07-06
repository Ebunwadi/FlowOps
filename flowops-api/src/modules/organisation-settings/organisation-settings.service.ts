import type { Prisma } from "../../generated/prisma/client";
import { logger } from "../../config/logger";
import {
  createOrganisationSettings,
  findOrganisationSettingsByOrganisationId,
  updateOrganisationSettingsByOrganisationId,
} from "./organisation-settings.repository";
import {
  toOrganisationSettingsResponse,
  type OrganisationSettingsResponse,
} from "./organisation-settings.mapper";
import type { UpdateOrganisationSettingsBody } from "./organisation-settings.validation";

type TransactionClient = Prisma.TransactionClient;

export async function createDefaultOrganisationSettings(
  organisationId: string,
  tx?: TransactionClient,
): Promise<void> {
  await createOrganisationSettings(organisationId, tx);
}

export async function getOrganisationSettings(
  organisationId: string,
): Promise<OrganisationSettingsResponse> {
  let settings = await findOrganisationSettingsByOrganisationId(organisationId);

  if (!settings) {
    settings = await createOrganisationSettings(organisationId);
  }

  return toOrganisationSettingsResponse(settings);
}

export async function updateOrganisationSettings(
  organisationId: string,
  input: UpdateOrganisationSettingsBody,
): Promise<OrganisationSettingsResponse> {
  await getOrganisationSettings(organisationId);

  const settings = await updateOrganisationSettingsByOrganisationId(
    organisationId,
    input,
  );

  logger.info(
    {
      origin: "api",
      event: "organisation_settings.updated",
      organisationId,
      updatedFields: Object.keys(input),
    },
    "[API] Organisation settings updated",
  );

  return toOrganisationSettingsResponse(settings);
}
