const CURRENT_ORGANISATION_ID_KEY = "flowops:current-organisation-id";

export function readStoredOrganisationId(): string | null {
  return localStorage.getItem(CURRENT_ORGANISATION_ID_KEY);
}

export function writeStoredOrganisationId(organisationId: string): void {
  localStorage.setItem(CURRENT_ORGANISATION_ID_KEY, organisationId);
}

export function clearStoredOrganisationId(): void {
  localStorage.removeItem(CURRENT_ORGANISATION_ID_KEY);
}
