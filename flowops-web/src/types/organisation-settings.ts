export interface OrganisationSettings {
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

export interface UpdateOrganisationSettingsInput {
  allowAiFeatures?: boolean;
  allowWebhooks?: boolean;
  allowApiKeys?: boolean;
  defaultSlaHours?: number | null;
  requireCommentsOnReject?: boolean;
}
