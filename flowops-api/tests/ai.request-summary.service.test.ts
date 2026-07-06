import { AuthorizationError, NotFoundError } from "../src/common/errors/httpErrors";
import { recordAiRequestSummaryAuditEvent } from "../src/modules/ai/ai.audit";
import * as aiProviderModule from "../src/modules/ai/ai.provider";
import * as aiService from "../src/modules/ai/ai.service";
import * as organisationSettingsRepository from "../src/modules/organisation-settings/organisation-settings.repository";
import * as workflowRequestAccess from "../src/modules/workflow-requests/workflow-request.access";
import * as workflowRequestRepository from "../src/modules/workflow-requests/workflow-request.repository";

jest.mock("../src/modules/organisation-settings/organisation-settings.repository");
jest.mock("../src/modules/workflow-requests/workflow-request.repository");
jest.mock("../src/modules/workflow-requests/workflow-request.access");
jest.mock("../src/modules/ai/ai.provider");
jest.mock("../src/modules/ai/ai.audit", () => ({
  recordAiWorkflowGenerationAuditEvent: jest.fn(),
  recordAiRequestSummaryAuditEvent: jest.fn(),
}));

describe("AI request summary service", () => {
  const organisationId = "550e8400-e29b-41d4-a716-446655440000";
  const workflowRequestId = "aaaa9999-9999-4999-8999-999999999999";
  const viewer = {
    userId: "770e8400-e29b-41d4-a716-446655440002",
    roleId: "44444444-4444-4444-8444-444444444444",
  };

  const requestRecord = {
    id: workflowRequestId,
    organisationId,
    title: "New laptop",
    status: "PENDING",
    submittedAt: new Date("2026-07-01T10:00:00.000Z"),
    completedAt: null,
    cancelledAt: null,
    createdAt: new Date("2026-07-01T09:00:00.000Z"),
    updatedAt: new Date("2026-07-01T10:00:00.000Z"),
    requesterId: viewer.userId,
    requester: {
      id: viewer.userId,
      firstName: "Ebube",
      lastName: "Nwadiokwu",
      email: "ebube@flowops.local",
    },
    workflowTemplate: {
      id: "template-1",
      name: "Equipment Request",
      category: "IT",
      steps: [
        {
          id: "step-1",
          name: "Manager Approval",
          description: null,
          stepOrder: 1,
          slaHours: 24,
          allowDelegation: false,
          approverRole: { id: "role-manager", name: "Manager" },
        },
        {
          id: "step-2",
          name: "IT Approval",
          description: null,
          stepOrder: 2,
          slaHours: 24,
          allowDelegation: false,
          approverRole: { id: "role-admin", name: "Admin" },
        },
      ],
    },
    currentStep: {
      id: "step-1",
      name: "Manager Approval",
      stepOrder: 1,
      approverRoleId: "role-manager",
    },
    values: [
      {
        workflowFieldId: "field-1",
        value: "MacBook Pro",
        workflowField: {
          fieldKey: "item_requested",
          label: "Item requested",
          fieldType: "SHORT_TEXT" as const,
        },
      },
    ],
    approvals: [],
    comments: [],
    attachments: [],
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
    jest
      .mocked(workflowRequestRepository.findWorkflowRequestDetail)
      .mockResolvedValue(requestRecord as never);
    jest
      .mocked(workflowRequestAccess.viewerCanAccessWorkflowRequest)
      .mockResolvedValue(true);
    jest.mocked(aiProviderModule.getAiProvider).mockReturnValue({
      generateWorkflowSuggestion: jest.fn(),
      generateRequestSummary: jest.fn().mockResolvedValue(
        "This equipment request was submitted by Ebube for a MacBook Pro and is currently pending manager approval.",
      ),
    });
  });

  it("returns a summary for a request the viewer can access", async () => {
    const result = await aiService.generateWorkflowRequestSummary(
      organisationId,
      viewer,
      workflowRequestId,
    );

    expect(result.summary).toContain("equipment request");
    expect(recordAiRequestSummaryAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        organisationId,
        actorUserId: viewer.userId,
        workflowRequestId,
      }),
    );
  });

  it("returns not found for another organisation's request", async () => {
    jest
      .mocked(workflowRequestRepository.findWorkflowRequestDetail)
      .mockResolvedValue(null);

    await expect(
      aiService.generateWorkflowRequestSummary(
        organisationId,
        viewer,
        workflowRequestId,
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("returns forbidden when the viewer cannot access the request", async () => {
    jest
      .mocked(workflowRequestAccess.viewerCanAccessWorkflowRequest)
      .mockResolvedValue(false);

    await expect(
      aiService.generateWorkflowRequestSummary(
        organisationId,
        viewer,
        workflowRequestId,
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("returns forbidden when AI features are disabled", async () => {
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
      aiService.generateWorkflowRequestSummary(
        organisationId,
        viewer,
        workflowRequestId,
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});
