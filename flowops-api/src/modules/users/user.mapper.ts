import type { AuthenticatedUser } from "../../auth/types";

/** Input derived from Keycloak token claims for local profile persistence. */
export interface UserProfileInput {
  keycloakUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

/** API response combining the local profile with session roles from Keycloak. */
export interface UserProfileResponse {
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

export function mapAuthUserToProfileInput(
  authUser: AuthenticatedUser,
): UserProfileInput {
  const { firstName, lastName } = resolveName(authUser);

  return {
    keycloakUserId: authUser.id,
    email: resolveEmail(authUser),
    firstName,
    lastName,
  };
}

function resolveEmail(authUser: AuthenticatedUser): string {
  if (authUser.email) {
    return authUser.email;
  }

  return `${authUser.username}@flowops.local`;
}

function resolveName(authUser: AuthenticatedUser): {
  firstName: string | null;
  lastName: string | null;
} {
  if (authUser.givenName || authUser.familyName) {
    return {
      firstName: authUser.givenName ?? null,
      lastName: authUser.familyName ?? null,
    };
  }

  if (!authUser.name?.trim()) {
    return { firstName: null, lastName: null };
  }

  const [firstName, ...rest] = authUser.name.trim().split(/\s+/);

  return {
    firstName: firstName ?? null,
    lastName: rest.length > 0 ? rest.join(" ") : null,
  };
}

export function toUserProfileResponse(
  user: {
    id: string;
    keycloakUserId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  authUser: AuthenticatedUser,
): UserProfileResponse {
  return {
    id: user.id,
    keycloakUserId: user.keycloakUserId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    username: authUser.username,
    roles: authUser.roles,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function profileNeedsUpdate(
  existing: UserProfileInput & { email: string; firstName: string | null; lastName: string | null },
  incoming: UserProfileInput,
): boolean {
  return (
    existing.email !== incoming.email ||
    existing.firstName !== incoming.firstName ||
    existing.lastName !== incoming.lastName
  );
}
