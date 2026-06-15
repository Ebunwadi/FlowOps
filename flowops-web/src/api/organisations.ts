import { apiClient } from "@/api/client";
import type {
  CreateOrganisationInput,
  CreateOrganisationResult,
  OrganisationSummary,
} from "@/types/organisation";

export function listOrganisations(): Promise<OrganisationSummary[]> {
  return apiClient<OrganisationSummary[]>("/organisations");
}

export function createOrganisation(
  input: CreateOrganisationInput,
): Promise<CreateOrganisationResult> {
  return apiClient<CreateOrganisationResult>("/organisations", {
    method: "POST",
    body: input,
  });
}
