/**
 * Module-level token accessor used by the API client.
 * React hooks cannot be used inside fetch helpers, so AuthProvider registers
 * the live getter after Keycloak initialises.
 */
let accessTokenGetter: (() => Promise<string | undefined>) | null = null;

export function registerAccessTokenGetter(
  getter: () => Promise<string | undefined>,
): void {
  accessTokenGetter = getter;
}

export function clearAccessTokenGetter(): void {
  accessTokenGetter = null;
}

export async function getRegisteredAccessToken(): Promise<string | undefined> {
  if (!accessTokenGetter) {
    return undefined;
  }

  return accessTokenGetter();
}
