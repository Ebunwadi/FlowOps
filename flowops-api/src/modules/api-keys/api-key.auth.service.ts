import {
  AuthenticationError,
  AuthorizationError,
} from "../../common/errors/httpErrors";
import { prisma } from "../../config/database";
import { DEFAULT_ORGANISATION_SETTINGS } from "../organisation-settings/organisation-settings.defaults";
import { findOrganisationSettingsByOrganisationId } from "../organisation-settings/organisation-settings.repository";
import {
  API_KEY_PREFIX,
  extractApiKeyPrefix,
  verifyApiKey,
} from "./api-key.crypto";
import {
  findActiveApiKeyCandidatesByPrefix,
  updateApiKeyLastUsedAt,
} from "./api-key.repository";
import type { ApiKeyAuthenticationResult } from "./api-key.types";

export const API_KEY_HEADER = "x-api-key";

function readApiKeyHeader(value: string | string[] | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function extractApiKeyFromHeaders(
  headers: Record<string, string | string[] | undefined>,
): string {
  const rawKey = readApiKeyHeader(headers[API_KEY_HEADER]);

  if (!rawKey) {
    throw new AuthenticationError("Missing or invalid x-api-key header");
  }

  if (!rawKey.startsWith(API_KEY_PREFIX)) {
    throw new AuthenticationError("Missing or invalid x-api-key header");
  }

  return rawKey;
}

async function assertApiKeysEnabledForOrganisation(
  organisationId: string,
): Promise<void> {
  const settings = await findOrganisationSettingsByOrganisationId(organisationId);
  const allowApiKeys =
    settings?.allowApiKeys ?? DEFAULT_ORGANISATION_SETTINGS.allowApiKeys;

  if (!allowApiKeys) {
    throw new AuthorizationError("API keys are disabled for this organisation");
  }
}

export async function authenticateApiKey(
  rawKey: string,
): Promise<ApiKeyAuthenticationResult> {
  const keyPrefix = extractApiKeyPrefix(rawKey);
  const candidates = await findActiveApiKeyCandidatesByPrefix(keyPrefix);

  let matchedKey: (typeof candidates)[number] | null = null;

  for (const candidate of candidates) {
    const isValid = await verifyApiKey(rawKey, candidate.keyHash);

    if (isValid) {
      matchedKey = candidate;
      break;
    }
  }

  if (!matchedKey) {
    throw new AuthenticationError("Invalid API key");
  }

  if (matchedKey.revokedAt) {
    throw new AuthenticationError("Invalid API key");
  }

  if (matchedKey.expiresAt && matchedKey.expiresAt.getTime() <= Date.now()) {
    throw new AuthenticationError("API key has expired");
  }

  await assertApiKeysEnabledForOrganisation(matchedKey.organisationId);

  const organisation = await prisma.organisation.findUnique({
    where: { id: matchedKey.organisationId },
  });

  if (!organisation) {
    throw new AuthenticationError("Invalid API key");
  }

  await updateApiKeyLastUsedAt(matchedKey.id, new Date());

  return {
    apiKey: {
      id: matchedKey.id,
      name: matchedKey.name,
      organisationId: matchedKey.organisationId,
      keyPrefix: matchedKey.keyPrefix,
      scopes: matchedKey.scopes,
    },
    organisation,
  };
}
