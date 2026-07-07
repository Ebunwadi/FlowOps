import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../common/errors/httpErrors";
import { logger } from "../../config/logger";
import { DEFAULT_ORGANISATION_SETTINGS } from "../organisation-settings/organisation-settings.defaults";
import { findOrganisationSettingsByOrganisationId } from "../organisation-settings/organisation-settings.repository";
import { API_KEY_AUDIT_ACTIONS, recordApiKeyAuditEvent } from "./api-key.audit";
import {
  extractApiKeyPrefix,
  generateRawApiKey,
  hashApiKey,
} from "./api-key.crypto";
import {
  toApiKeyResponse,
  toCreatedApiKeyResponse,
  type ApiKeyResponse,
  type CreatedApiKeyResponse,
} from "./api-key.mapper";
import {
  createApiKeyRecord,
  findApiKeyByIdInOrganisation,
  findApiKeysByOrganisationId,
  revokeApiKeyByIdInOrganisation,
} from "./api-key.repository";
import type { CreateApiKeyBody } from "./api-key.validation";

async function assertApiKeysEnabled(organisationId: string): Promise<void> {
  const settings = await findOrganisationSettingsByOrganisationId(organisationId);
  const allowApiKeys =
    settings?.allowApiKeys ?? DEFAULT_ORGANISATION_SETTINGS.allowApiKeys;

  if (!allowApiKeys) {
    throw new AuthorizationError("API keys are disabled for this organisation");
  }
}

function assertValidExpiry(expiresAt?: Date): void {
  if (!expiresAt) {
    return;
  }

  if (expiresAt.getTime() <= Date.now()) {
    throw new ValidationError("Expiry date must be in the future");
  }
}

export async function createApiKey(
  organisationId: string,
  createdById: string,
  input: CreateApiKeyBody,
): Promise<CreatedApiKeyResponse> {
  await assertApiKeysEnabled(organisationId);
  assertValidExpiry(input.expiresAt);

  const rawKey = generateRawApiKey();
  const keyPrefix = extractApiKeyPrefix(rawKey);
  const keyHash = await hashApiKey(rawKey);

  const record = await createApiKeyRecord({
    organisationId,
    name: input.name,
    keyPrefix,
    keyHash,
    scopes: input.scopes,
    expiresAt: input.expiresAt ?? null,
    createdById,
  });

  logger.info(
    {
      origin: "api",
      event: "api_key.created",
      organisationId,
      apiKeyId: record.id,
      createdById,
      keyPrefix,
    },
    `[API] API key "${record.name}" created`,
  );

  recordApiKeyAuditEvent({
    action: API_KEY_AUDIT_ACTIONS.CREATED,
    organisationId,
    actorUserId: createdById,
    apiKeyId: record.id,
    metadata: {
      name: record.name,
      keyPrefix: record.keyPrefix,
    },
  });

  return toCreatedApiKeyResponse(record, rawKey);
}

export async function listApiKeys(organisationId: string): Promise<ApiKeyResponse[]> {
  await assertApiKeysEnabled(organisationId);

  const records = await findApiKeysByOrganisationId(organisationId);
  return records.map(toApiKeyResponse);
}

export async function revokeApiKey(
  organisationId: string,
  actorUserId: string,
  apiKeyId: string,
): Promise<ApiKeyResponse> {
  await assertApiKeysEnabled(organisationId);

  const existing = await findApiKeyByIdInOrganisation(apiKeyId, organisationId);

  if (!existing) {
    throw new NotFoundError("API key not found");
  }

  if (existing.revokedAt) {
    throw new ConflictError("API key has already been revoked");
  }

  const revokedAt = new Date();
  const result = await revokeApiKeyByIdInOrganisation(
    apiKeyId,
    organisationId,
    revokedAt,
  );

  if (result.count === 0) {
    throw new ConflictError("API key has already been revoked");
  }

  const revoked = await findApiKeyByIdInOrganisation(apiKeyId, organisationId);

  if (!revoked) {
    throw new NotFoundError("API key not found");
  }

  logger.info(
    {
      origin: "api",
      event: "api_key.revoked",
      organisationId,
      apiKeyId,
      actorUserId,
    },
    `[API] API key "${revoked.name}" revoked`,
  );

  recordApiKeyAuditEvent({
    action: API_KEY_AUDIT_ACTIONS.REVOKED,
    organisationId,
    actorUserId,
    apiKeyId,
    metadata: {
      name: revoked.name,
      keyPrefix: revoked.keyPrefix,
    },
  });

  return toApiKeyResponse(revoked);
}
