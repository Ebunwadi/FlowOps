import { apiClient } from "@/api/client";
import type {
  OrganisationSettings,
  UpdateOrganisationSettingsInput,
} from "@/types/organisation-settings";

export function getOrganisationSettings(): Promise<OrganisationSettings> {
  return apiClient<OrganisationSettings>("/organisation-settings");
}

export function updateOrganisationSettings(
  input: UpdateOrganisationSettingsInput,
): Promise<OrganisationSettings> {
  return apiClient<OrganisationSettings>("/organisation-settings", {
    method: "PATCH",
    body: input,
  });
}
