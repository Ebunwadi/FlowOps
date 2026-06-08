import { prisma } from "../../config/database";
import type { User } from "../../generated/prisma/client";
import type { UserProfileInput } from "./user.mapper";

export async function findUserByKeycloakUserId(
  keycloakUserId: string,
): Promise<User | null> {
  return prisma.user.findUnique({
    where: { keycloakUserId },
  });
}

export async function createUserFromProfile(
  profile: UserProfileInput,
): Promise<User> {
  return prisma.user.create({
    data: profile,
  });
}

export async function updateUserProfile(
  userId: string,
  profile: UserProfileInput,
): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: {
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
    },
  });
}
