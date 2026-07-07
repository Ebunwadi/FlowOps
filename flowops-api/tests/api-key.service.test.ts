import { AuthorizationError, ConflictError, NotFoundError } from "../src/common/errors/httpErrors";
import { recordApiKeyAuditEvent } from "../src/modules/api-keys/api-key.audit";
import * as apiKeyCrypto from "../src/modules/api-keys/api-key.crypto";
import * as apiKeyService from "../src/modules/api-keys/api-key.service";
import * as apiKeyRepository from "../src/modules/api-keys/api-key.repository";
import * as organisationSettingsRepository from "../src/modules/organisation-settings/organisation-settings.repository";

jest.mock("../src/modules/organisation-settings/organisation-settings.repository");
jest.mock("../src/modules/api-keys/api-key.repository");
jest.mock("../src/modules/api-keys/api-key.crypto");
jest.mock("../src/modules/api-keys/api-key.audit", () => ({
  API_KEY_AUDIT_ACTIONS: {
    CREATED: "API_KEY_CREATED",
    REVOKED: "API_KEY_REVOKED",
  },
  recordApiKeyAuditEvent: jest.fn(),
}));

describe("API key service", () => {
  const organisationId = "550e8400-e29b-41d4-a716-446655440000";
  const createdById = "770e8400-e29b-41d4-a716-446655440002";
  const apiKeyId = "88888888-8888-4888-8888-888888888888";

  const apiKeyRecord = {
    id: apiKeyId,
    organisationId,
    name: "Integration key",
    keyPrefix: "flowops_live_abcd1234",
    scopes: null,
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
    createdAt: new Date("2026-07-06T12:00:00.000Z"),
    createdBy: {
      id: createdById,
      firstName: "Admin",
      lastName: "User",
      email: "admin@flowops.local",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(organisationSettingsRepository.findOrganisationSettingsByOrganisationId)
      .mockResolvedValue({
        id: "settings-1",
        organisationId,
        allowAiFeatures: true,
        allowWebhooks: true,
        allowApiKeys: true,
        defaultSlaHours: null,
        requireCommentsOnReject: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    jest.mocked(apiKeyCrypto.generateRawApiKey).mockReturnValue("flowops_live_secretvalue123");
    jest.mocked(apiKeyCrypto.extractApiKeyPrefix).mockReturnValue("flowops_live_secret");
    jest.mocked(apiKeyCrypto.hashApiKey).mockResolvedValue("salt:hash");
    jest
      .mocked(apiKeyRepository.createApiKeyRecord)
      .mockResolvedValue(apiKeyRecord as never);
    jest
      .mocked(apiKeyRepository.findApiKeysByOrganisationId)
      .mockResolvedValue([apiKeyRecord] as never);
    jest
      .mocked(apiKeyRepository.findApiKeyByIdInOrganisation)
      .mockImplementation(async (id) =>
        id === apiKeyId ? (apiKeyRecord as never) : null,
      );
    jest.mocked(apiKeyRepository.revokeApiKeyByIdInOrganisation).mockResolvedValue({
      count: 1,
    });
  });

  it("creates an API key and returns the raw key once", async () => {
    const result = await apiKeyService.createApiKey(organisationId, createdById, {
      name: "Integration key",
    });

    expect(result.rawKey).toBe("flowops_live_secretvalue123");
    expect(result.keyPrefix).toBe("flowops_live_abcd1234");
    expect(result).not.toHaveProperty("keyHash");
    expect(apiKeyRepository.createApiKeyRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        organisationId,
        keyHash: "salt:hash",
        createdById,
      }),
    );
    expect(recordApiKeyAuditEvent).toHaveBeenCalled();
  });

  it("lists API keys without exposing raw secrets", async () => {
    const result = await apiKeyService.listApiKeys(organisationId);

    expect(result).toHaveLength(1);
    expect(result[0]?.keyPrefix).toBe("flowops_live_abcd1234");
    expect(result[0]).not.toHaveProperty("rawKey");
    expect(result[0]).not.toHaveProperty("keyHash");
  });

  it("revokes an active API key", async () => {
    jest
      .mocked(apiKeyRepository.findApiKeyByIdInOrganisation)
      .mockResolvedValueOnce(apiKeyRecord as never)
      .mockResolvedValueOnce({
        ...apiKeyRecord,
        revokedAt: new Date("2026-07-06T13:00:00.000Z"),
      } as never);

    const result = await apiKeyService.revokeApiKey(
      organisationId,
      createdById,
      apiKeyId,
    );

    expect(result.revokedAt).not.toBeNull();
    expect(recordApiKeyAuditEvent).toHaveBeenCalled();
  });

  it("rejects API key operations when disabled for the organisation", async () => {
    jest
      .mocked(organisationSettingsRepository.findOrganisationSettingsByOrganisationId)
      .mockResolvedValue({
        id: "settings-1",
        organisationId,
        allowAiFeatures: true,
        allowWebhooks: true,
        allowApiKeys: false,
        defaultSlaHours: null,
        requireCommentsOnReject: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    await expect(
      apiKeyService.createApiKey(organisationId, createdById, {
        name: "Integration key",
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("returns not found when revoking a missing key", async () => {
    jest
      .mocked(apiKeyRepository.findApiKeyByIdInOrganisation)
      .mockResolvedValue(null);

    await expect(
      apiKeyService.revokeApiKey(organisationId, createdById, apiKeyId),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("returns conflict when revoking an already revoked key", async () => {
    jest.mocked(apiKeyRepository.findApiKeyByIdInOrganisation).mockResolvedValue({
      ...apiKeyRecord,
      revokedAt: new Date("2026-07-06T13:00:00.000Z"),
    } as never);

    await expect(
      apiKeyService.revokeApiKey(organisationId, createdById, apiKeyId),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
