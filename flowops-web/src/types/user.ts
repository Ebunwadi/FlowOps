/** Local FlowOps user profile synced from Keycloak. */
export interface FlowOpsUserProfile {
  id: string;
  keycloakUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  username: string;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

export function formatProfileName(profile: FlowOpsUserProfile): string {
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");

  if (fullName) {
    return fullName;
  }

  return profile.email;
}
