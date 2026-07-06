import { AuthorizationError } from "../src/common/errors/httpErrors";
import { recordAiWorkflowGenerationAuditEvent } from "../src/modules/ai/ai.audit";
import { AiGenerationError } from "../src/modules/ai/ai.errors";
import * as aiProviderModule from "../src/modules/ai/ai.provider";
import * as aiService from "../src/modules/ai/ai.service";
import * as organisationSettingsRepository from "../src/modules/organisation-settings/organisation-settings.repository";

jest.mock("../src/modules/organisation-settings/organisation-settings.repository");
jest.mock("../src/modules/ai/ai.provider");
jest.mock("../src/modules/ai/ai.audit", () => ({
  recordAiWorkflowGenerationAuditEvent: jest.fn(),
}));

describe("AI workflow generation service", () => {
  const organisationId = "550e8400-e29b-41d4-a716-446655440000";
  const actorUserId = "770e8400-e29b-41d4-a716-446655440002";

  const suggestion = {
    name: "Equipment Request",
    description: "Used by staff to request work equipment.",
    category: "IT",
    fields: [
      {
        label: "Item requested",
        fieldKey: "item_requested",
        fieldType: "SHORT_TEXT" as const,
        isRequired: true,
        fieldOrder: 1,
      },
    ],
    steps: [
      {
        name: "Manager Approval",
        stepOrder: 1,
        suggestedApproverRole: "Manager",
      },
    ],
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
    jest.mocked(aiProviderModule.getAiProvider).mockReturnValue({
      generateWorkflowSuggestion: jest.fn().mockResolvedValue(suggestion),
      generateRequestSummary: jest.fn(),
    });
  });

  it("returns a validated workflow suggestion without saving it", async () => {
    const result = await aiService.generateWorkflowSuggestion(
      organisationId,
      actorUserId,
      {
        prompt: "Create an equipment request workflow for staff laptops.",
      },
    );

    expect(result).toEqual(suggestion);
    expect(recordAiWorkflowGenerationAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        organisationId,
        actorUserId,
        suggestionName: suggestion.name,
        fieldsCount: 1,
        stepsCount: 1,
      }),
    );
  });

  it("rejects generation when AI features are disabled for the organisation", async () => {
    jest
      .mocked(organisationSettingsRepository.findOrganisationSettingsByOrganisationId)
      .mockResolvedValue({
        id: "settings-1",
        organisationId,
        allowAiFeatures: false,
        allowWebhooks: true,
        allowApiKeys: true,
        defaultSlaHours: null,
        requireCommentsOnReject: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    await expect(
      aiService.generateWorkflowSuggestion(organisationId, actorUserId, {
        prompt: "Create an equipment request workflow for staff laptops.",
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("returns an error when the provider response fails validation", async () => {
    jest.mocked(aiProviderModule.getAiProvider).mockReturnValue({
      generateWorkflowSuggestion: jest.fn().mockResolvedValue({
        name: "Bad",
        fields: [],
        steps: [],
      }),
      generateRequestSummary: jest.fn(),
    });

    await expect(
      aiService.generateWorkflowSuggestion(organisationId, actorUserId, {
        prompt: "Create an equipment request workflow for staff laptops.",
      }),
    ).rejects.toBeInstanceOf(AiGenerationError);
  });

  it("returns an error when the provider fails", async () => {
    jest.mocked(aiProviderModule.getAiProvider).mockReturnValue({
      generateWorkflowSuggestion: jest
        .fn()
        .mockRejectedValue(new AiGenerationError("Failed to contact AI provider")),
      generateRequestSummary: jest.fn(),
    });

    await expect(
      aiService.generateWorkflowSuggestion(organisationId, actorUserId, {
        prompt: "Create an equipment request workflow for staff laptops.",
      }),
    ).rejects.toThrow("Failed to contact AI provider");
  });
});
