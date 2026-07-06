import type { OrganisationSettings } from "../../generated/prisma/client";

export interface OrganisationSettingsResponse {
  id: string;
  organisationId: string;
  allowAiFeatures: boolean;
  allowWebhooks: boolean;
  allowApiKeys: boolean;
  defaultSlaHours: number | null;
  requireCommentsOnReject: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toOrganisationSettingsResponse(
  settings: OrganisationSettings,
): OrganisationSettingsResponse {
  return {
    id: settings.id,
    organisationId: settings.organisationId,
    allowAiFeatures: settings.allowAiFeatures,
    allowWebhooks: settings.allowWebhooks,
    allowApiKeys: settings.allowApiKeys,
    defaultSlaHours: settings.defaultSlaHours,
    requireCommentsOnReject: settings.requireCommentsOnReject,
    createdAt: settings.createdAt.toISOString(),
    updatedAt: settings.updatedAt.toISOString(),
  };
}
