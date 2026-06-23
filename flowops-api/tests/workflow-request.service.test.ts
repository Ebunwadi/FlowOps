import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../src/common/errors/httpErrors";
import { prisma } from "../src/config/database";
import * as roleRepository from "../src/modules/roles/role.repository";
import { recordWorkflowRequestAuditEvent } from "../src/modules/workflow-requests/workflow-request.audit";
import { notifyApproversOfPendingRequest } from "../src/modules/workflow-requests/workflow-request.notifications";
import * as workflowRequestRepository from "../src/modules/workflow-requests/workflow-request.repository";
import {
  cancelWorkflowRequest,
  getWorkflowRequestDetail,
  listMyWorkflowRequests,
  listOrganisationWorkflowRequests,
  saveDraftWorkflowRequest,
  submitDraftWorkflowRequest,
  submitWorkflowRequest,
  updateDraftWorkflowRequest,
} from "../src/modules/workflow-requests/workflow-request.service";

jest.mock("../src/modules/workflow-requests/workflow-request.repository");
jest.mock("../src/modules/roles/role.repository");
jest.mock("../src/modules/workflow-requests/workflow-request.notifications", () => ({
  notifyApproversOfPendingRequest: jest.fn(),
}));
jest.mock("../src/modules/workflow-requests/workflow-request.audit", () => ({
  recordWorkflowRequestAuditEvent: jest.fn(),
  WORKFLOW_REQUEST_AUDIT_ACTIONS: {
    SUBMITTED: "WORKFLOW_REQUEST_SUBMITTED",
    DRAFT_CREATED: "WORKFLOW_REQUEST_DRAFT_CREATED",
    DRAFT_UPDATED: "WORKFLOW_REQUEST_DRAFT_UPDATED",
    CANCELLED: "WORKFLOW_REQUEST_CANCELLED",
  },
}));
jest.mock("../src/config/database", () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

describe("workflow request service", () => {
  const organisationId = "550e8400-e29b-41d4-a716-446655440000";
  const requesterId = "770e8400-e29b-41d4-a716-446655440002";
  const otherUserId = "880e8400-e29b-41d4-a716-446655440003";
  const templateId = "99999999-9999-4999-8999-999999999999";
  const requestId = "aaaa9999-9999-4999-8999-999999999999";
  const itemFieldId = "11111111-1111-4111-8111-111111111111";
  const urgencyFieldId = "22222222-2222-4222-8222-222222222222";
  const stepId = "33333333-3333-4333-8333-333333333333";
  const approverRoleId = "44444444-4444-4444-8444-444444444444";

  const activeTemplate = {
    id: templateId,
    name: "Equipment Request",
    status: "ACTIVE" as const,
    fields: [
      {
        id: itemFieldId,
        fieldKey: "item_requested",
        label: "Item requested",
        fieldType: "SHORT_TEXT" as const,
        isRequired: true,
        options: null,
      },
      {
        id: urgencyFieldId,
        fieldKey: "urgency",
        label: "Urgency",
        fieldType: "DROPDOWN" as const,
        isRequired: true,
        options: ["Low", "High"],
      },
    ],
    steps: [
      {
        id: stepId,
        name: "Manager Approval",
        stepOrder: 1,
        approverRoleId,
      },
    ],
  };

  const validValues = [
    { workflowFieldId: itemFieldId, value: "Laptop" },
    { workflowFieldId: urgencyFieldId, value: "High" },
  ];

  const submittedRecord = {
    id: requestId,
    title: "New laptop request",
    status: "PENDING_APPROVAL" as const,
    submittedAt: new Date("2026-06-19T10:30:00.000Z"),
    currentStep: { id: stepId, name: "Manager Approval" },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      (callback as (tx: unknown) => unknown)({}),
    );
    jest
      .mocked(workflowRequestRepository.findTemplateForRequestSubmission)
      .mockResolvedValue(activeTemplate);
    jest
      .mocked(workflowRequestRepository.createWorkflowRequestWithValues)
      .mockResolvedValue(submittedRecord);
    jest.mocked(roleRepository.findPermissionKeysByRoleId).mockResolvedValue([]);
  });

  describe("getWorkflowRequestDetail", () => {
    const staffRoleId = "55555555-5555-4555-8555-555555555555";
    const adminRoleId = "66666666-6666-4666-8666-666666666666";

    const detailRecord = {
      id: requestId,
      organisationId,
      requesterId,
      title: "New laptop request",
      status: "PENDING_APPROVAL" as const,
      submittedAt: new Date("2026-06-19T10:30:00.000Z"),
      completedAt: null,
      cancelledAt: null,
      createdAt: new Date("2026-06-19T09:00:00.000Z"),
      updatedAt: new Date("2026-06-19T10:30:00.000Z"),
      requester: {
        id: requesterId,
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
      },
      workflowTemplate: {
        id: templateId,
        name: "Equipment Request",
        category: "IT",
        steps: [
          {
            id: stepId,
            name: "Manager Approval",
            description: null,
            stepOrder: 1,
            slaHours: null,
            allowDelegation: false,
            approverRole: { id: approverRoleId, name: "Manager" },
          },
        ],
      },
      currentStep: {
        id: stepId,
        name: "Manager Approval",
        stepOrder: 1,
        approverRoleId,
      },
      values: [
        {
          workflowFieldId: itemFieldId,
          value: "Laptop",
          workflowField: {
            fieldKey: "item_requested",
            label: "Item requested",
            fieldType: "SHORT_TEXT" as const,
          },
        },
      ],
      approvals: [],
    };

    beforeEach(() => {
      jest
        .mocked(workflowRequestRepository.findWorkflowRequestDetail)
        .mockResolvedValue(detailRecord);
    });

    it("lets the requester view their own request with submitted values and current step", async () => {
      const result = await getWorkflowRequestDetail(
        organisationId,
        { userId: requesterId, roleId: staffRoleId },
        requestId,
      );

      expect(result.id).toBe(requestId);
      expect(result.currentStep?.id).toBe(stepId);
      expect(result.values).toEqual([
        {
          workflowFieldId: itemFieldId,
          fieldKey: "item_requested",
          label: "Item requested",
          fieldType: "SHORT_TEXT",
          value: "Laptop",
        },
      ]);
      expect(roleRepository.findPermissionKeysByRoleId).not.toHaveBeenCalled();
    });

    it("includes approval history ordered by decision date", async () => {
      const decidedAt = new Date("2026-06-20T14:00:00.000Z");
      jest.mocked(workflowRequestRepository.findWorkflowRequestDetail).mockResolvedValue({
        ...detailRecord,
        approvals: [
          {
            id: "bbbb8888-8888-4888-8888-888888888888",
            decision: "APPROVED",
            comment: "Looks good.",
            decidedAt,
            workflowStep: {
              id: stepId,
              name: "Manager Approval",
              stepOrder: 1,
            },
            approver: {
              id: otherUserId,
              firstName: "Grace",
              lastName: "Hopper",
              email: "grace@example.com",
            },
          },
        ],
      });

      const result = await getWorkflowRequestDetail(
        organisationId,
        { userId: requesterId, roleId: staffRoleId },
        requestId,
      );

      expect(result.approvalHistory).toEqual([
        {
          id: "bbbb8888-8888-4888-8888-888888888888",
          step: {
            id: stepId,
            name: "Manager Approval",
            stepOrder: 1,
          },
          approver: {
            id: otherUserId,
            firstName: "Grace",
            lastName: "Hopper",
            email: "grace@example.com",
          },
          decision: "APPROVED",
          comment: "Looks good.",
          decidedAt: decidedAt.toISOString(),
        },
      ]);
    });

    it("lets an approver assigned to the current step role view the request", async () => {
      const result = await getWorkflowRequestDetail(
        organisationId,
        { userId: otherUserId, roleId: approverRoleId },
        requestId,
      );

      expect(result.id).toBe(requestId);
    });

    it("lets a user with requests:view-all view the request", async () => {
      jest
        .mocked(roleRepository.findPermissionKeysByRoleId)
        .mockResolvedValue(["requests:view-all"]);

      const result = await getWorkflowRequestDetail(
        organisationId,
        { userId: otherUserId, roleId: adminRoleId },
        requestId,
      );

      expect(result.id).toBe(requestId);
    });

    it("rejects an unauthorised user with 403", async () => {
      jest
        .mocked(roleRepository.findPermissionKeysByRoleId)
        .mockResolvedValue(["requests:view-own"]);

      await expect(
        getWorkflowRequestDetail(
          organisationId,
          { userId: otherUserId, roleId: staffRoleId },
          requestId,
        ),
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it("returns 404 when the request does not exist", async () => {
      jest
        .mocked(workflowRequestRepository.findWorkflowRequestDetail)
        .mockResolvedValue(null);

      await expect(
        getWorkflowRequestDetail(
          organisationId,
          { userId: requesterId, roleId: staffRoleId },
          requestId,
        ),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("submitWorkflowRequest", () => {
    it("submits a request, assigns the first step, and notifies approvers", async () => {
      const result = await submitWorkflowRequest(organisationId, requesterId, {
        workflowTemplateId: templateId,
        title: "New laptop request",
        values: validValues,
      });

      expect(result.status).toBe("PENDING_APPROVAL");
      expect(result.currentStep).toEqual({ id: stepId, name: "Manager Approval" });

      expect(
        workflowRequestRepository.createWorkflowRequestWithValues,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          organisationId,
          workflowTemplateId: templateId,
          requesterId,
          currentStepId: stepId,
          status: "PENDING_APPROVAL",
        }),
        expect.anything(),
      );
      expect(recordWorkflowRequestAuditEvent).toHaveBeenCalledTimes(1);
      expect(notifyApproversOfPendingRequest).toHaveBeenCalledTimes(1);
    });

    it("rejects when the template does not exist", async () => {
      jest
        .mocked(workflowRequestRepository.findTemplateForRequestSubmission)
        .mockResolvedValue(null);

      await expect(
        submitWorkflowRequest(organisationId, requesterId, {
          workflowTemplateId: templateId,
          values: validValues,
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("rejects when the template is not active", async () => {
      jest
        .mocked(workflowRequestRepository.findTemplateForRequestSubmission)
        .mockResolvedValue({ ...activeTemplate, status: "DRAFT" });

      await expect(
        submitWorkflowRequest(organisationId, requesterId, {
          workflowTemplateId: templateId,
          values: validValues,
        }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(notifyApproversOfPendingRequest).not.toHaveBeenCalled();
    });

    it("rejects when a required field is missing", async () => {
      await expect(
        submitWorkflowRequest(organisationId, requesterId, {
          workflowTemplateId: templateId,
          values: [{ workflowFieldId: itemFieldId, value: "Laptop" }],
        }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(
        workflowRequestRepository.createWorkflowRequestWithValues,
      ).not.toHaveBeenCalled();
    });
  });

  describe("listMyWorkflowRequests", () => {
    const listRow = {
      id: requestId,
      title: "New laptop request",
      status: "PENDING_APPROVAL" as const,
      submittedAt: new Date("2026-06-19T10:30:00.000Z"),
      createdAt: new Date("2026-06-19T09:00:00.000Z"),
      updatedAt: new Date("2026-06-19T10:30:00.000Z"),
      workflowTemplate: { id: templateId, name: "Equipment Request" },
      requester: {
        id: requesterId,
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
      },
      currentStep: { id: stepId, name: "Manager Approval" },
    };

    beforeEach(() => {
      jest
        .mocked(workflowRequestRepository.findWorkflowRequests)
        .mockResolvedValue([listRow]);
      jest
        .mocked(workflowRequestRepository.countWorkflowRequests)
        .mockResolvedValue(1);
    });

    it("scopes the query to the current requester and organisation", async () => {
      const result = await listMyWorkflowRequests(organisationId, requesterId, {
        page: 1,
        limit: 20,
      });

      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.workflowTemplate.name).toBe("Equipment Request");

      expect(workflowRequestRepository.findWorkflowRequests).toHaveBeenCalledWith(
        organisationId,
        expect.objectContaining({ requesterId, page: 1, limit: 20 }),
      );
    });

    it("passes status and template filters through", async () => {
      await listMyWorkflowRequests(organisationId, requesterId, {
        status: "DRAFT",
        workflowTemplateId: templateId,
        search: "laptop",
        page: 2,
        limit: 5,
      });

      expect(workflowRequestRepository.findWorkflowRequests).toHaveBeenCalledWith(
        organisationId,
        expect.objectContaining({
          requesterId,
          status: "DRAFT",
          workflowTemplateId: templateId,
          search: "laptop",
          page: 2,
          limit: 5,
        }),
      );
    });

    it("returns zero totalPages when there are no requests", async () => {
      jest
        .mocked(workflowRequestRepository.findWorkflowRequests)
        .mockResolvedValue([]);
      jest
        .mocked(workflowRequestRepository.countWorkflowRequests)
        .mockResolvedValue(0);

      const result = await listMyWorkflowRequests(organisationId, requesterId, {
        page: 1,
        limit: 20,
      });

      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(result.items).toEqual([]);
    });
  });

  describe("listOrganisationWorkflowRequests", () => {
    const listRow = {
      id: requestId,
      title: "New laptop request",
      status: "PENDING_APPROVAL" as const,
      submittedAt: new Date("2026-06-19T10:30:00.000Z"),
      createdAt: new Date("2026-06-19T09:00:00.000Z"),
      updatedAt: new Date("2026-06-19T10:30:00.000Z"),
      workflowTemplate: { id: templateId, name: "Equipment Request" },
      requester: {
        id: requesterId,
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
      },
      currentStep: { id: stepId, name: "Manager Approval" },
    };

    beforeEach(() => {
      jest
        .mocked(workflowRequestRepository.findWorkflowRequests)
        .mockResolvedValue([listRow]);
      jest
        .mocked(workflowRequestRepository.countWorkflowRequests)
        .mockResolvedValue(1);
    });

    it("lists org-wide requests without forcing a requester filter", async () => {
      const result = await listOrganisationWorkflowRequests(organisationId, {
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.requester.email).toBe("ada@example.com");

      expect(workflowRequestRepository.findWorkflowRequests).toHaveBeenCalledWith(
        organisationId,
        expect.objectContaining({ requesterId: undefined, page: 1, limit: 20 }),
      );
    });

    it("allows filtering by a specific requester", async () => {
      await listOrganisationWorkflowRequests(organisationId, {
        requesterId: otherUserId,
        status: "APPROVED",
        page: 1,
        limit: 20,
      });

      expect(workflowRequestRepository.findWorkflowRequests).toHaveBeenCalledWith(
        organisationId,
        expect.objectContaining({
          requesterId: otherUserId,
          status: "APPROVED",
        }),
      );
    });
  });

  describe("cancelWorkflowRequest", () => {
    const cancellableRequest = {
      id: requestId,
      requesterId,
      status: "PENDING_APPROVAL" as const,
      workflowTemplateId: templateId,
      title: "New laptop request",
      values: [],
    };

    beforeEach(() => {
      jest
        .mocked(workflowRequestRepository.findWorkflowRequestForMutation)
        .mockResolvedValue(cancellableRequest);
      jest
        .mocked(workflowRequestRepository.markWorkflowRequestCancelled)
        .mockResolvedValue({
          id: requestId,
          title: "New laptop request",
          status: "CANCELLED",
          cancelledAt: new Date("2026-06-20T08:00:00.000Z"),
        });
    });

    it("cancels an eligible request and records an audit entry", async () => {
      const result = await cancelWorkflowRequest(
        organisationId,
        requesterId,
        requestId,
      );

      expect(result.status).toBe("CANCELLED");
      expect(result.cancelledAt).toBe("2026-06-20T08:00:00.000Z");
      expect(
        workflowRequestRepository.markWorkflowRequestCancelled,
      ).toHaveBeenCalledTimes(1);
      expect(recordWorkflowRequestAuditEvent).toHaveBeenCalledTimes(1);
    });

    it("rejects cancellation by a non-requester", async () => {
      await expect(
        cancelWorkflowRequest(organisationId, otherUserId, requestId),
      ).rejects.toBeInstanceOf(AuthorizationError);
      expect(
        workflowRequestRepository.markWorkflowRequestCancelled,
      ).not.toHaveBeenCalled();
    });

    it("rejects cancelling an approved (completed) request", async () => {
      jest
        .mocked(workflowRequestRepository.findWorkflowRequestForMutation)
        .mockResolvedValue({ ...cancellableRequest, status: "APPROVED" });

      await expect(
        cancelWorkflowRequest(organisationId, requesterId, requestId),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("rejects cancelling a rejected request", async () => {
      jest
        .mocked(workflowRequestRepository.findWorkflowRequestForMutation)
        .mockResolvedValue({ ...cancellableRequest, status: "REJECTED" });

      await expect(
        cancelWorkflowRequest(organisationId, requesterId, requestId),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("rejects cancelling an already cancelled request", async () => {
      jest
        .mocked(workflowRequestRepository.findWorkflowRequestForMutation)
        .mockResolvedValue({ ...cancellableRequest, status: "CANCELLED" });

      await expect(
        cancelWorkflowRequest(organisationId, requesterId, requestId),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("returns 404 when the request does not exist", async () => {
      jest
        .mocked(workflowRequestRepository.findWorkflowRequestForMutation)
        .mockResolvedValue(null);

      await expect(
        cancelWorkflowRequest(organisationId, requesterId, requestId),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("saveDraftWorkflowRequest", () => {
    const draftRecord = {
      id: requestId,
      workflowTemplateId: templateId,
      title: "Draft laptop request",
      status: "DRAFT" as const,
      createdAt: new Date("2026-06-19T09:00:00.000Z"),
      updatedAt: new Date("2026-06-19T09:00:00.000Z"),
      values: [{ workflowFieldId: itemFieldId, value: "Laptop" }],
    };

    beforeEach(() => {
      jest
        .mocked(workflowRequestRepository.createDraftWorkflowRequestRecord)
        .mockResolvedValue(draftRecord);
    });

    it("saves an incomplete draft without entering the approval flow", async () => {
      const result = await saveDraftWorkflowRequest(organisationId, requesterId, {
        workflowTemplateId: templateId,
        title: "Draft laptop request",
        values: [{ workflowFieldId: itemFieldId, value: "Laptop" }],
      });

      expect(result.status).toBe("DRAFT");
      expect(
        workflowRequestRepository.createDraftWorkflowRequestRecord,
      ).toHaveBeenCalledTimes(1);
      expect(notifyApproversOfPendingRequest).not.toHaveBeenCalled();
    });

    it("still validates the types of provided draft values", async () => {
      await expect(
        saveDraftWorkflowRequest(organisationId, requesterId, {
          workflowTemplateId: templateId,
          values: [{ workflowFieldId: urgencyFieldId, value: "Critical" }],
        }),
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe("updateDraftWorkflowRequest", () => {
    const existingDraft = {
      id: requestId,
      requesterId,
      status: "DRAFT" as const,
      workflowTemplateId: templateId,
      title: "Draft",
      values: [],
    };

    beforeEach(() => {
      jest
        .mocked(workflowRequestRepository.findWorkflowRequestForMutation)
        .mockResolvedValue(existingDraft);
      jest
        .mocked(workflowRequestRepository.updateDraftWorkflowRequestRecord)
        .mockResolvedValue({
          id: requestId,
          workflowTemplateId: templateId,
          title: "Updated draft",
          status: "DRAFT",
          createdAt: new Date(),
          updatedAt: new Date(),
          values: [],
        });
    });

    it("updates a draft owned by the requester", async () => {
      const result = await updateDraftWorkflowRequest(
        organisationId,
        requesterId,
        requestId,
        { title: "Updated draft" },
      );

      expect(result.title).toBe("Updated draft");
      expect(
        workflowRequestRepository.updateDraftWorkflowRequestRecord,
      ).toHaveBeenCalledTimes(1);
    });

    it("rejects updates from a different user", async () => {
      await expect(
        updateDraftWorkflowRequest(organisationId, otherUserId, requestId, {
          title: "Hijacked",
        }),
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it("rejects updating a non-draft request", async () => {
      jest
        .mocked(workflowRequestRepository.findWorkflowRequestForMutation)
        .mockResolvedValue({ ...existingDraft, status: "PENDING_APPROVAL" });

      await expect(
        updateDraftWorkflowRequest(organisationId, requesterId, requestId, {
          title: "Too late",
        }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("rejects when the draft is not found", async () => {
      jest
        .mocked(workflowRequestRepository.findWorkflowRequestForMutation)
        .mockResolvedValue(null);

      await expect(
        updateDraftWorkflowRequest(organisationId, requesterId, requestId, {
          title: "Missing",
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("submitDraftWorkflowRequest", () => {
    beforeEach(() => {
      jest
        .mocked(workflowRequestRepository.findWorkflowRequestForMutation)
        .mockResolvedValue({
          id: requestId,
          requesterId,
          status: "DRAFT",
          workflowTemplateId: templateId,
          title: "Draft",
          values: validValues,
        });
      jest
        .mocked(workflowRequestRepository.submitDraftWorkflowRequestRecord)
        .mockResolvedValue(submittedRecord);
    });

    it("validates required fields and submits the draft into the approval flow", async () => {
      const result = await submitDraftWorkflowRequest(
        organisationId,
        requesterId,
        requestId,
      );

      expect(result.status).toBe("PENDING_APPROVAL");
      expect(
        workflowRequestRepository.submitDraftWorkflowRequestRecord,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowRequestId: requestId,
          currentStepId: stepId,
        }),
        expect.anything(),
      );
      expect(notifyApproversOfPendingRequest).toHaveBeenCalledTimes(1);
    });

    it("rejects submitting an incomplete draft (missing required field)", async () => {
      jest
        .mocked(workflowRequestRepository.findWorkflowRequestForMutation)
        .mockResolvedValue({
          id: requestId,
          requesterId,
          status: "DRAFT",
          workflowTemplateId: templateId,
          title: "Draft",
          values: [{ workflowFieldId: itemFieldId, value: "Laptop" }],
        });

      await expect(
        submitDraftWorkflowRequest(organisationId, requesterId, requestId),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(
        workflowRequestRepository.submitDraftWorkflowRequestRecord,
      ).not.toHaveBeenCalled();
    });

    it("rejects submitting another user's draft", async () => {
      await expect(
        submitDraftWorkflowRequest(organisationId, otherUserId, requestId),
      ).rejects.toBeInstanceOf(AuthorizationError);
    });
  });
});
