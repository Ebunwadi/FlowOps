let organisationIdGetter: (() => string | undefined) | null = null;

export function registerOrganisationIdGetter(
  getter: () => string | undefined,
): void {
  organisationIdGetter = getter;
}

export function clearOrganisationIdGetter(): void {
  organisationIdGetter = null;
}

export function getRegisteredOrganisationId(): string | undefined {
  if (!organisationIdGetter) {
    return undefined;
  }

  return organisationIdGetter();
}
