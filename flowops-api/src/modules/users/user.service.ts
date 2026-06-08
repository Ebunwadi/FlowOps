import type { AuthenticatedUser } from "../../auth/types";
import { logger } from "../../config/logger";
import type { User } from "../../generated/prisma/client";
import {
  mapAuthUserToProfileInput,
  profileNeedsUpdate,
} from "./user.mapper";
import {
  createUserFromProfile,
  findUserByKeycloakUserId,
  updateUserProfile,
} from "./user.repository";

/**
 * Ensures a local User row exists for the authenticated Keycloak identity.
 * Creates on first sight, updates when email or name claims change.
 */
export async function syncUserFromKeycloak(
  authUser: AuthenticatedUser,
): Promise<User> {
  const profile = mapAuthUserToProfileInput(authUser);
  const existing = await findUserByKeycloakUserId(profile.keycloakUserId);

  if (!existing) {
    const created = await createUserFromProfile(profile);

    logger.info(
      {
        origin: "api",
        event: "user.created",
        userId: created.id,
        keycloakUserId: created.keycloakUserId,
      },
      `[API] Local user profile created for ${authUser.username}`,
    );

    return created;
  }

  if (!profileNeedsUpdate(existing, profile)) {
    return existing;
  }

  const updated = await updateUserProfile(existing.id, profile);

  logger.info(
    {
      origin: "api",
      event: "user.updated",
      userId: updated.id,
      keycloakUserId: updated.keycloakUserId,
    },
    `[API] Local user profile updated for ${authUser.username}`,
  );

  return updated;
}
