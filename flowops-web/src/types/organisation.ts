export interface OrganisationSummary {
  id: string;
  name: string;
  slug: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateOrganisationInput {
  name: string;
  slug: string;
}

export interface CreateOrganisationResult {
  id: string;
  name: string;
  slug: string;
  role: string;
}
