import { prisma } from "../../config/database";

const apiKeyListSelect = {
  id: true,
  organisationId: true,
  name: true,
  keyPrefix: true,
  scopes: true,
  lastUsedAt: true,
  expiresAt: true,
  revokedAt: true,
  createdAt: true,
  createdBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} as const;

export async function createApiKeyRecord(input: {
  organisationId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes?: unknown;
  expiresAt?: Date | null;
  createdById: string;
}) {
  return prisma.apiKey.create({
    data: {
      organisationId: input.organisationId,
      name: input.name,
      keyPrefix: input.keyPrefix,
      keyHash: input.keyHash,
      scopes: input.scopes ?? undefined,
      expiresAt: input.expiresAt ?? undefined,
      createdById: input.createdById,
    },
    select: apiKeyListSelect,
  });
}

export async function findApiKeysByOrganisationId(organisationId: string) {
  return prisma.apiKey.findMany({
    where: { organisationId },
    orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }],
    select: apiKeyListSelect,
  });
}

export async function findApiKeyByIdInOrganisation(
  apiKeyId: string,
  organisationId: string,
) {
  return prisma.apiKey.findFirst({
    where: {
      id: apiKeyId,
      organisationId,
    },
    select: apiKeyListSelect,
  });
}

export async function revokeApiKeyByIdInOrganisation(
  apiKeyId: string,
  organisationId: string,
  revokedAt: Date,
) {
  return prisma.apiKey.updateMany({
    where: {
      id: apiKeyId,
      organisationId,
      revokedAt: null,
    },
    data: {
      revokedAt,
    },
  });
}

export async function findActiveApiKeyCandidatesByPrefix(keyPrefix: string) {
  return prisma.apiKey.findMany({
    where: {
      keyPrefix,
      revokedAt: null,
    },
    select: {
      id: true,
      organisationId: true,
      name: true,
      keyPrefix: true,
      keyHash: true,
      scopes: true,
      expiresAt: true,
      revokedAt: true,
    },
  });
}

export async function updateApiKeyLastUsedAt(apiKeyId: string, lastUsedAt: Date) {
  return prisma.apiKey.update({
    where: { id: apiKeyId },
    data: { lastUsedAt },
  });
}

export async function findApiKeyByPrefix(keyPrefix: string) {
  return prisma.apiKey.findFirst({
    where: {
      keyPrefix,
      revokedAt: null,
    },
  });
}
