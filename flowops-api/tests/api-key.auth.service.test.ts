import { AuthenticationError, AuthorizationError } from "../src/common/errors/httpErrors";
import { prisma } from "../src/config/database";
import * as apiKeyCrypto from "../src/modules/api-keys/api-key.crypto";
import { authenticateApiKey } from "../src/modules/api-keys/api-key.auth.service";
import * as apiKeyRepository from "../src/modules/api-keys/api-key.repository";
import * as organisationSettingsRepository from "../src/modules/organisation-settings/organisation-settings.repository";

jest.mock("../src/config/database", () => ({
  prisma: {
    organisation: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("../src/modules/api-keys/api-key.repository");
jest.mock("../src/modules/api-keys/api-key.crypto");
jest.mock("../src/modules/organisation-settings/organisation-settings.repository");

describe("authenticateApiKey", () => {
  const organisationId = "550e8400-e29b-41d4-a716-446655440000";
  const rawKey = "flowops_live_secretvalue123456";
  const keyPrefix = "flowops_live_secretv";

  const candidate = {
    id: "88888888-8888-4888-8888-888888888888",
    organisationId,
    name: "Integration key",
    keyPrefix,
    keyHash: "salt:hash",
    scopes: null,
    expiresAt: null,
    revokedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(apiKeyCrypto.extractApiKeyPrefix).mockReturnValue(keyPrefix);
    jest.mocked(apiKeyCrypto.verifyApiKey).mockResolvedValue(true);
    jest
      .mocked(apiKeyRepository.findActiveApiKeyCandidatesByPrefix)
      .mockResolvedValue([candidate]);
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
    jest.mocked(prisma.organisation.findUnique).mockResolvedValue({
      id: organisationId,
      name: "FlowOps Demo Organisation",
      slug: "flowops-demo",
      createdById: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    jest.mocked(apiKeyRepository.updateApiKeyLastUsedAt).mockResolvedValue({
      id: candidate.id,
    } as never);
  });

  it("authenticates a valid API key and scopes it to the organisation", async () => {
    const result = await authenticateApiKey(rawKey);

    expect(result.organisation.id).toBe(organisationId);
    expect(result.apiKey.id).toBe(candidate.id);
    expect(apiKeyRepository.updateApiKeyLastUsedAt).toHaveBeenCalledWith(
      candidate.id,
      expect.any(Date),
    );
  });

  it("rejects invalid API keys", async () => {
    jest.mocked(apiKeyCrypto.verifyApiKey).mockResolvedValue(false);

    await expect(authenticateApiKey(rawKey)).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });

  it("rejects expired API keys", async () => {
    jest.mocked(apiKeyRepository.findActiveApiKeyCandidatesByPrefix).mockResolvedValue([
      {
        ...candidate,
        expiresAt: new Date("2020-01-01T00:00:00.000Z"),
      },
    ]);

    await expect(authenticateApiKey(rawKey)).rejects.toThrow("API key has expired");
  });

  it("rejects authentication when API keys are disabled for the organisation", async () => {
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

    await expect(authenticateApiKey(rawKey)).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });
});
