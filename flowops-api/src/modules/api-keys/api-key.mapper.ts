import type { Prisma } from "../../generated/prisma/client";

type ApiKeyListRecord = {
  id: string;
  organisationId: string;
  name: string;
  keyPrefix: string;
  scopes: Prisma.JsonValue;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  createdBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
};

export interface ApiKeyResponse {
  id: string;
  organisationId: string;
  name: string;
  keyPrefix: string;
  scopes: unknown;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

export interface CreatedApiKeyResponse extends ApiKeyResponse {
  rawKey: string;
}

function formatPersonName(person: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): { firstName: string | null; lastName: string | null; email: string } {
  return {
    firstName: person.firstName,
    lastName: person.lastName,
    email: person.email,
  };
}

export function toApiKeyResponse(record: ApiKeyListRecord): ApiKeyResponse {
  return {
    id: record.id,
    organisationId: record.organisationId,
    name: record.name,
    keyPrefix: record.keyPrefix,
    scopes: record.scopes,
    lastUsedAt: record.lastUsedAt?.toISOString() ?? null,
    expiresAt: record.expiresAt?.toISOString() ?? null,
    revokedAt: record.revokedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    createdBy: {
      id: record.createdBy.id,
      ...formatPersonName(record.createdBy),
    },
  };
}

export function toCreatedApiKeyResponse(
  record: ApiKeyListRecord,
  rawKey: string,
): CreatedApiKeyResponse {
  return {
    ...toApiKeyResponse(record),
    rawKey,
  };
}
