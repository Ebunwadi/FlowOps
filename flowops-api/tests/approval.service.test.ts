import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
} from "../src/common/errors/httpErrors";
import { prisma } from "../src/config/database";
import { recordApprovalAuditEvent } from "../src/modules/approvals/approval.audit";
import {
  notifyApproversOfNextStep,
  notifyRequesterOfApprovedStep,
  notifyRequesterOfChangesRequested,
  notifyRequesterOfCompletedRequest,
  notifyRequesterOfRejectedRequest,
} from "../src/modules/approvals/approval.notifications";
import * as approvalRepository from "../src/modules/approvals/approval.repository";
import * as approvalDelegationRepository from "../src/modules/approvals/approval-delegation.repository";
import * as outOfOfficeRepository from "../src/modules/out-of-office/out-of-office.repository";
import {
  approveWorkflowRequest,
  delegateWorkflowRequestApproval,
  isOrganisationOwnerRole,
  listPendingApprovals,
  rejectWorkflowRequest,
  requestChangesWorkflowRequest,
} from "../src/modules/approvals/approval.service";
import { DEFAULT_ROLE_NAMES } from "../src/modules/roles/default-roles";

jest.mock("../src/modules/approvals/approval.repository");
jest.mock("../src/modules/approvals/approval-delegation.repository");
jest.mock("../src/modules/out-of-office/out-of-office.repository");
jest.mock("../src/modules/approvals/approval.audit", () => ({
  recordApprovalAuditEvent: jest.fn(),
  APPROVAL_AUDIT_ACTIONS: {
    STEP_APPROVED: "WORKFLOW_REQUEST_STEP_APPROVED",
    COMPLETED: "WORKFLOW_REQUEST_COMPLETED",
    REJECTED: "WORKFLOW_REQUEST_REJECTED",
    CHANGES_REQUESTED: "WORKFLOW_REQUEST_CHANGES_REQUESTED",
    DELEGATED: "WORKFLOW_REQUEST_APPROVAL_DELEGATED",
  },
}));
jest.mock("../src/modules/approvals/approval.notifications", () => ({
  notifyApproversOfNextStep: jest.fn(),
  notifyApprovalDelegated: jest.fn(),
  notifyRequesterOfApprovedStep: jest.fn(),
  notifyRequesterOfCompletedRequest: jest.fn(),
  notifyRequesterOfRejectedRequest: jest.fn(),
  notifyRequesterOfChangesRequested: jest.fn(),
}));
jest.mock("../src/config/database", () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

describe("approval service", () => {
  const organisationId = "550e8400-e29b-41d4-a716-446655440000";
  const approverUserId = "660e8400-e29b-41d4-a716-446655440001";
  const requesterId = "770e8400-e29b-41d4-a716-446655440002";
  const approverRoleId = "44444444-4444-4444-8444-444444444444";
  const otherRoleId = "55555555-5555-4555-8555-555555555555";
  const requestId = "aaaa9999-9999-4999-8999-999999999999";
  const templateId = "99999999-9999-4999-8999-999999999999";
  const stepOneId = "33333333-3333-4333-8333-333333333333";
  const stepTwoId = "44444444-4444-4444-8444-444444444444";
  const submittedAt = new Date("2026-06-20T10:00:00.000Z");

  const pendingRow = {
    id: requestId,
    title: "New laptop request",
    status: "PENDING_APPROVAL" as const,
    submittedAt,
    workflowTemplate: {
      id: templateId,
      name: "Equipment Request",
    },
    requester: {
      id: requesterId,
      firstName: "Alex",
      lastName: "Staff",
      email: "alex@example.com",
    },
    currentStep: {
      id: stepOneId,
      name: "Manager Approval",
      slaHours: 24,
      approverRoleId,
    },
  };

  const requestForApproval = {
    id: requestId,
    organisationId,
    workflowTemplateId: templateId,
    requesterId,
    title: "New laptop request",
    status: "PENDING_APPROVAL" as const,
    currentStepId: stepOneId,
    currentStep: {
      id: stepOneId,
      name: "Manager Approval",
      stepOrder: 10,
      approverRoleId,
      allowDelegation: true,
    },
    workflowTemplate: {
      id: templateId,
      name: "Equipment Request",
      steps: [
        {
          id: stepOneId,
          name: "Manager Approval",
          stepOrder: 10,
          approverRoleId,
          condition: null,
          allowDelegation: true,
        },
        {
          id: stepTwoId,
          name: "IT Approval",
          stepOrder: 20,
          approverRoleId: otherRoleId,
          condition: null,
          allowDelegation: false,
        },
      ],
    },
    values: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      callback(prisma as never),
    );
    jest
      .mocked(approvalDelegationRepository.findActiveDelegatedRequestIdsForUser)
      .mockResolvedValue([]);
    jest
      .mocked(outOfOfficeRepository.findOutOfOfficeDelegatedPendingRequestIds)
      .mockResolvedValue([]);
    jest
      .mocked(outOfOfficeRepository.findOutOfOfficeReassignmentsForDelegate)
      .mockResolvedValue([]);
    jest
      .mocked(outOfOfficeRepository.isActiveOutOfOfficeDelegateForRole)
      .mockResolvedValue(false);
    jest
      .mocked(approvalDelegationRepository.findApprovalDelegationForRequestStep)
      .mockResolvedValue(null);
  });

  describe("isOrganisationOwnerRole", () => {
    it("returns true for the Owner role name", () => {
      expect(isOrganisationOwnerRole(DEFAULT_ROLE_NAMES.OWNER)).toBe(true);
    });

    it("returns false for non-owner roles", () => {
      expect(isOrganisationOwnerRole(DEFAULT_ROLE_NAMES.MANAGER)).toBe(false);
    });
  });

  describe("listPendingApprovals", () => {
    it("scopes pending approvals to the viewer role for non-owners", async () => {
      jest.mocked(approvalRepository.findPendingApprovals).mockResolvedValue([pendingRow]);
      jest.mocked(approvalRepository.countPendingApprovals).mockResolvedValue(1);

      const result = await listPendingApprovals(
        organisationId,
        { userId: approverUserId, roleId: approverRoleId, roleName: DEFAULT_ROLE_NAMES.MANAGER },
        { page: 1, limit: 20 },
      );

      expect(approvalRepository.findPendingApprovals).toHaveBeenCalledWith(organisationId, {
        approverRoleId,
        delegatedRequestIds: [],
        search: undefined,
        page: 1,
        limit: 20,
      });
      expect(result.items).toHaveLength(1);
    });

    it("returns all pending approvals for organisation owners", async () => {
      jest.mocked(approvalRepository.findPendingApprovals).mockResolvedValue([pendingRow]);
      jest.mocked(approvalRepository.countPendingApprovals).mockResolvedValue(1);

      await listPendingApprovals(
        organisationId,
        { userId: approverUserId, roleId: approverRoleId, roleName: DEFAULT_ROLE_NAMES.OWNER },
        { page: 1, limit: 20 },
      );

      expect(approvalRepository.findPendingApprovals).toHaveBeenCalledWith(organisationId, {
        approverRoleId: undefined,
        delegatedRequestIds: undefined,
        search: undefined,
        page: 1,
        limit: 20,
      });
    });
  });

  describe("approveWorkflowRequest", () => {
    it("advances the request to the next step when one exists", async () => {
      jest
        .mocked(approvalRepository.findWorkflowRequestForApproval)
        .mockResolvedValue(requestForApproval);
      jest.mocked(approvalRepository.findBlockingApprovalDecisionForStep).mockResolvedValue(null);
      jest.mocked(approvalRepository.createApprovalDecision).mockResolvedValue({} as never);
      jest.mocked(approvalRepository.applyWorkflowRequestApproval).mockResolvedValue({
        id: requestId,
        title: "New laptop request",
        status: "PENDING_APPROVAL",
        submittedAt,
        currentStep: { id: stepTwoId, name: "IT Approval" },
      });

      const result = await approveWorkflowRequest(
        organisationId,
        {
          userId: approverUserId,
          roleId: approverRoleId,
          roleName: DEFAULT_ROLE_NAMES.MANAGER,
        },
        requestId,
        { comment: "Approved" },
      );

      expect(approvalRepository.createApprovalDecision).toHaveBeenCalledWith(
        {
          workflowRequestId: requestId,
          workflowStepId: stepOneId,
          approverId: approverUserId,
          decision: "APPROVED",
          comment: "Approved",
        },
        prisma,
      );
      expect(approvalRepository.applyWorkflowRequestApproval).toHaveBeenCalledWith(
        {
          workflowRequestId: requestId,
          nextStepId: stepTwoId,
          status: "PENDING_APPROVAL",
          completedAt: null,
        },
        prisma,
      );
      expect(notifyApproversOfNextStep).toHaveBeenCalledWith({
        organisationId,
        workflowRequestId: requestId,
        workflowTemplateId: templateId,
        stepId: stepTwoId,
        approverRoleId: otherRoleId,
        stepName: "IT Approval",
        requestTitle: "New laptop request",
        workflowName: "Equipment Request",
      });
      expect(notifyRequesterOfApprovedStep).toHaveBeenCalled();
      expect(notifyRequesterOfCompletedRequest).not.toHaveBeenCalled();
      expect(result.status).toBe("PENDING_APPROVAL");
      expect(result.currentStep).toMatchObject({ id: stepTwoId });
    });

    it("skips ineligible conditional steps and completes when no further steps match", async () => {
      const conditionalRequest = {
        ...requestForApproval,
        workflowTemplate: {
          ...requestForApproval.workflowTemplate,
          steps: [
            requestForApproval.workflowTemplate.steps[0],
            {
              ...requestForApproval.workflowTemplate.steps[1],
              condition: {
                fieldKey: "urgency",
                operator: "equals",
                value: "High",
              },
            },
          ],
        },
        values: [
          {
            value: "Low",
            workflowField: { fieldKey: "urgency" },
          },
        ],
      };

      jest
        .mocked(approvalRepository.findWorkflowRequestForApproval)
        .mockResolvedValue(conditionalRequest);
      jest.mocked(approvalRepository.findBlockingApprovalDecisionForStep).mockResolvedValue(null);
      jest.mocked(approvalRepository.createApprovalDecision).mockResolvedValue({} as never);
      jest.mocked(approvalRepository.applyWorkflowRequestApproval).mockResolvedValue({
        id: requestId,
        title: "New laptop request",
        status: "APPROVED",
        submittedAt,
        currentStep: null,
      });

      const result = await approveWorkflowRequest(
        organisationId,
        {
          userId: approverUserId,
          roleId: approverRoleId,
          roleName: DEFAULT_ROLE_NAMES.MANAGER,
        },
        requestId,
        {},
      );

      expect(approvalRepository.applyWorkflowRequestApproval).toHaveBeenCalledWith(
        {
          workflowRequestId: requestId,
          nextStepId: null,
          status: "APPROVED",
          completedAt: expect.any(Date),
        },
        prisma,
      );
      expect(notifyApproversOfNextStep).not.toHaveBeenCalled();
      expect(notifyRequesterOfCompletedRequest).toHaveBeenCalled();
      expect(result.status).toBe("APPROVED");
    });

    it("completes the request on the final approval step", async () => {
      const finalStepRequest = {
        ...requestForApproval,
        currentStep: requestForApproval.workflowTemplate.steps[1],
        currentStepId: stepTwoId,
        workflowTemplate: {
          ...requestForApproval.workflowTemplate,
          steps: [requestForApproval.workflowTemplate.steps[1]],
        },
      };

      jest
        .mocked(approvalRepository.findWorkflowRequestForApproval)
        .mockResolvedValue(finalStepRequest);
      jest.mocked(approvalRepository.findBlockingApprovalDecisionForStep).mockResolvedValue(null);
      jest.mocked(approvalRepository.createApprovalDecision).mockResolvedValue({} as never);
      jest.mocked(approvalRepository.applyWorkflowRequestApproval).mockResolvedValue({
        id: requestId,
        title: "New laptop request",
        status: "APPROVED",
        submittedAt,
        currentStep: null,
      });

      const result = await approveWorkflowRequest(
        organisationId,
        {
          userId: approverUserId,
          roleId: otherRoleId,
          roleName: DEFAULT_ROLE_NAMES.APPROVER,
        },
        requestId,
        {},
      );

      expect(approvalRepository.applyWorkflowRequestApproval).toHaveBeenCalledWith(
        expect.objectContaining({
          nextStepId: null,
          status: "APPROVED",
          completedAt: expect.any(Date),
        }),
        prisma,
      );
      expect(notifyRequesterOfCompletedRequest).toHaveBeenCalledWith({
        organisationId,
        workflowRequestId: requestId,
        workflowTemplateId: templateId,
        requesterId,
        requestTitle: "New laptop request",
      });
      expect(recordApprovalAuditEvent).toHaveBeenCalled();
      expect(result.status).toBe("APPROVED");
    });

    it("allows owners to approve even when not assigned to the current step role", async () => {
      jest
        .mocked(approvalRepository.findWorkflowRequestForApproval)
        .mockResolvedValue(requestForApproval);
      jest.mocked(approvalRepository.findBlockingApprovalDecisionForStep).mockResolvedValue(null);
      jest.mocked(approvalRepository.createApprovalDecision).mockResolvedValue({} as never);
      jest.mocked(approvalRepository.applyWorkflowRequestApproval).mockResolvedValue({
        id: requestId,
        title: "New laptop request",
        status: "PENDING_APPROVAL",
        submittedAt,
        currentStep: { id: stepTwoId, name: "IT Approval" },
      });

      await approveWorkflowRequest(
        organisationId,
        {
          userId: approverUserId,
          roleId: otherRoleId,
          roleName: DEFAULT_ROLE_NAMES.OWNER,
        },
        requestId,
        {},
      );

      expect(approvalRepository.createApprovalDecision).toHaveBeenCalled();
    });

    it("rejects approvers who are not assigned to the current step role", async () => {
      jest
        .mocked(approvalRepository.findWorkflowRequestForApproval)
        .mockResolvedValue(requestForApproval);
      jest.mocked(approvalRepository.findBlockingApprovalDecisionForStep).mockResolvedValue(null);

      await expect(
        approveWorkflowRequest(
          organisationId,
          {
            userId: approverUserId,
            roleId: otherRoleId,
            roleName: DEFAULT_ROLE_NAMES.STAFF,
          },
          requestId,
          {},
        ),
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it("rejects approval when the step has already been decided", async () => {
      jest
        .mocked(approvalRepository.findWorkflowRequestForApproval)
        .mockResolvedValue(requestForApproval);
      jest.mocked(approvalRepository.findBlockingApprovalDecisionForStep).mockResolvedValue({
        id: "approval-1",
        decision: "APPROVED",
      });

      await expect(
        approveWorkflowRequest(
          organisationId,
          {
            userId: approverUserId,
            roleId: approverRoleId,
            roleName: DEFAULT_ROLE_NAMES.MANAGER,
          },
          requestId,
          {},
        ),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("rejects approval when the request is not pending", async () => {
      jest.mocked(approvalRepository.findWorkflowRequestForApproval).mockResolvedValue({
        ...requestForApproval,
        status: "APPROVED",
      });

      await expect(
        approveWorkflowRequest(
          organisationId,
          {
            userId: approverUserId,
            roleId: approverRoleId,
            roleName: DEFAULT_ROLE_NAMES.MANAGER,
          },
          requestId,
          {},
        ),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("returns not found when the request does not exist", async () => {
      jest.mocked(approvalRepository.findWorkflowRequestForApproval).mockResolvedValue(null);

      await expect(
        approveWorkflowRequest(
          organisationId,
          {
            userId: approverUserId,
            roleId: approverRoleId,
            roleName: DEFAULT_ROLE_NAMES.MANAGER,
          },
          requestId,
          {},
        ),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("rejectWorkflowRequest", () => {
    it("rejects the request and clears the current step", async () => {
      jest
        .mocked(approvalRepository.findWorkflowRequestForApproval)
        .mockResolvedValue(requestForApproval);
      jest.mocked(approvalRepository.findBlockingApprovalDecisionForStep).mockResolvedValue(null);
      jest.mocked(approvalRepository.createApprovalDecision).mockResolvedValue({} as never);
      jest.mocked(approvalRepository.applyWorkflowRequestRejection).mockResolvedValue({
        id: requestId,
        title: "New laptop request",
        status: "REJECTED",
        submittedAt,
        currentStep: null,
      });

      const result = await rejectWorkflowRequest(
        organisationId,
        {
          userId: approverUserId,
          roleId: approverRoleId,
          roleName: DEFAULT_ROLE_NAMES.MANAGER,
        },
        requestId,
        { comment: "Rejected because the business reason is unclear." },
      );

      expect(approvalRepository.createApprovalDecision).toHaveBeenCalledWith(
        {
          workflowRequestId: requestId,
          workflowStepId: stepOneId,
          approverId: approverUserId,
          decision: "REJECTED",
          comment: "Rejected because the business reason is unclear.",
        },
        prisma,
      );
      expect(approvalRepository.applyWorkflowRequestRejection).toHaveBeenCalledWith(
        requestId,
        prisma,
      );
      expect(notifyRequesterOfRejectedRequest).toHaveBeenCalledWith({
        organisationId,
        workflowRequestId: requestId,
        workflowTemplateId: templateId,
        requesterId,
        comment: "Rejected because the business reason is unclear.",
        requestTitle: "New laptop request",
      });
      expect(result.status).toBe("REJECTED");
      expect(result.currentStep).toBeNull();
    });

    it("allows owners to reject even when not assigned to the current step role", async () => {
      jest
        .mocked(approvalRepository.findWorkflowRequestForApproval)
        .mockResolvedValue(requestForApproval);
      jest.mocked(approvalRepository.findBlockingApprovalDecisionForStep).mockResolvedValue(null);
      jest.mocked(approvalRepository.createApprovalDecision).mockResolvedValue({} as never);
      jest.mocked(approvalRepository.applyWorkflowRequestRejection).mockResolvedValue({
        id: requestId,
        title: "New laptop request",
        status: "REJECTED",
        submittedAt,
        currentStep: null,
      });

      await rejectWorkflowRequest(
        organisationId,
        {
          userId: approverUserId,
          roleId: otherRoleId,
          roleName: DEFAULT_ROLE_NAMES.OWNER,
        },
        requestId,
        { comment: "Rejected by owner." },
      );

      expect(approvalRepository.createApprovalDecision).toHaveBeenCalled();
    });

    it("rejects users who are not assigned to the current step role", async () => {
      jest
        .mocked(approvalRepository.findWorkflowRequestForApproval)
        .mockResolvedValue(requestForApproval);
      jest.mocked(approvalRepository.findBlockingApprovalDecisionForStep).mockResolvedValue(null);

      await expect(
        rejectWorkflowRequest(
          organisationId,
          {
            userId: approverUserId,
            roleId: otherRoleId,
            roleName: DEFAULT_ROLE_NAMES.STAFF,
          },
          requestId,
          { comment: "Not allowed." },
        ),
      ).rejects.toBeInstanceOf(AuthorizationError);
    });
  });

  describe("requestChangesWorkflowRequest", () => {
    it("requests changes and keeps the current step", async () => {
      jest
        .mocked(approvalRepository.findWorkflowRequestForApproval)
        .mockResolvedValue(requestForApproval);
      jest
        .mocked(approvalRepository.findBlockingApprovalDecisionForStep)
        .mockResolvedValue(null);
      jest.mocked(approvalRepository.createApprovalDecision).mockResolvedValue({} as never);
      jest
        .mocked(approvalRepository.applyWorkflowRequestChangesRequested)
        .mockResolvedValue({
          id: requestId,
          title: "New laptop request",
          status: "CHANGES_REQUESTED",
          submittedAt,
          currentStep: {
            id: stepOneId,
            name: "Manager Approval",
          },
        });

      const result = await requestChangesWorkflowRequest(
        organisationId,
        {
          userId: approverUserId,
          roleId: approverRoleId,
          roleName: DEFAULT_ROLE_NAMES.MANAGER,
        },
        requestId,
        { comment: "Please add a cost breakdown." },
      );

      expect(approvalRepository.createApprovalDecision).toHaveBeenCalledWith(
        {
          workflowRequestId: requestId,
          workflowStepId: stepOneId,
          approverId: approverUserId,
          decision: "CHANGES_REQUESTED",
          comment: "Please add a cost breakdown.",
        },
        prisma,
      );
      expect(approvalRepository.applyWorkflowRequestChangesRequested).toHaveBeenCalledWith(
        requestId,
        prisma,
      );
      expect(notifyRequesterOfChangesRequested).toHaveBeenCalledWith({
        organisationId,
        workflowRequestId: requestId,
        workflowTemplateId: templateId,
        requesterId,
        comment: "Please add a cost breakdown.",
        requestTitle: "New laptop request",
      });
      expect(result.status).toBe("CHANGES_REQUESTED");
      expect(result.currentStep?.id).toBe(stepOneId);
    });

    it("allows owners to request changes even when not assigned to the current step role", async () => {
      jest
        .mocked(approvalRepository.findWorkflowRequestForApproval)
        .mockResolvedValue(requestForApproval);
      jest.mocked(approvalRepository.findBlockingApprovalDecisionForStep).mockResolvedValue(null);
      jest.mocked(approvalRepository.createApprovalDecision).mockResolvedValue({} as never);
      jest
        .mocked(approvalRepository.applyWorkflowRequestChangesRequested)
        .mockResolvedValue({
          id: requestId,
          title: "New laptop request",
          status: "CHANGES_REQUESTED",
          submittedAt,
          currentStep: null,
        });

      await requestChangesWorkflowRequest(
        organisationId,
        {
          userId: approverUserId,
          roleId: otherRoleId,
          roleName: DEFAULT_ROLE_NAMES.OWNER,
        },
        requestId,
        { comment: "Changes requested by owner." },
      );

      expect(approvalRepository.createApprovalDecision).toHaveBeenCalled();
    });

    it("rejects users who are not assigned to the current step role", async () => {
      jest
        .mocked(approvalRepository.findWorkflowRequestForApproval)
        .mockResolvedValue(requestForApproval);
      jest.mocked(approvalRepository.findBlockingApprovalDecisionForStep).mockResolvedValue(null);

      await expect(
        requestChangesWorkflowRequest(
          organisationId,
          {
            userId: approverUserId,
            roleId: otherRoleId,
            roleName: DEFAULT_ROLE_NAMES.STAFF,
          },
          requestId,
          { comment: "Not allowed." },
        ),
      ).rejects.toBeInstanceOf(AuthorizationError);
    });
  });

  describe("delegateWorkflowRequestApproval", () => {
    const delegateUserId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

    it("creates a delegation when the current approver delegates", async () => {
      jest
        .mocked(approvalRepository.findWorkflowRequestForApproval)
        .mockResolvedValue(requestForApproval);
      jest.mocked(approvalRepository.findBlockingApprovalDecisionForStep).mockResolvedValue(null);
      jest
        .mocked(approvalDelegationRepository.findActiveOrganisationMemberByUserId)
        .mockResolvedValue({
          id: "member-2",
          userId: delegateUserId,
          roleId: otherRoleId,
        });
      jest.mocked(approvalDelegationRepository.upsertApprovalDelegationRecord).mockResolvedValue({
        id: "delegation-1",
        organisationId,
        workflowRequestId: requestId,
        workflowStepId: stepOneId,
        reason: "Out of office",
        createdAt: new Date("2026-07-07T12:00:00.000Z"),
        delegatedBy: {
          id: approverUserId,
          firstName: "Approver",
          lastName: "User",
          email: "approver@example.com",
        },
        delegatedTo: {
          id: delegateUserId,
          firstName: "Delegate",
          lastName: "User",
          email: "delegate@example.com",
        },
      });

      const result = await delegateWorkflowRequestApproval(
        organisationId,
        {
          userId: approverUserId,
          roleId: approverRoleId,
          roleName: DEFAULT_ROLE_NAMES.MANAGER,
        },
        requestId,
        { delegatedToId: delegateUserId, reason: "Out of office" },
      );

      expect(result.delegatedTo.id).toBe(delegateUserId);
      expect(approvalDelegationRepository.upsertApprovalDelegationRecord).toHaveBeenCalled();
      expect(recordApprovalAuditEvent).toHaveBeenCalled();
    });

    it("rejects delegation when the step does not allow it", async () => {
      jest.mocked(approvalRepository.findWorkflowRequestForApproval).mockResolvedValue({
        ...requestForApproval,
        currentStep: {
          ...requestForApproval.currentStep,
          allowDelegation: false,
        },
      });

      await expect(
        delegateWorkflowRequestApproval(
          organisationId,
          {
            userId: approverUserId,
            roleId: approverRoleId,
            roleName: DEFAULT_ROLE_NAMES.MANAGER,
          },
          requestId,
          { delegatedToId: delegateUserId },
        ),
      ).rejects.toThrow("Delegation is not allowed for the current approval step");
    });
  });

  describe("delegated approval actions", () => {
    const delegateUserId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

    it("allows a delegated user to approve the current step", async () => {
      jest
        .mocked(approvalRepository.findWorkflowRequestForApproval)
        .mockResolvedValue({
          ...requestForApproval,
          values: [],
        });
      jest.mocked(approvalRepository.findBlockingApprovalDecisionForStep).mockResolvedValue(null);
      jest.mocked(approvalDelegationRepository.findApprovalDelegationForRequestStep).mockResolvedValue({
        id: "delegation-1",
        organisationId,
        workflowRequestId: requestId,
        workflowStepId: stepOneId,
        reason: null,
        createdAt: new Date("2026-07-07T12:00:00.000Z"),
        delegatedBy: {
          id: approverUserId,
          firstName: "Approver",
          lastName: "User",
          email: "approver@example.com",
        },
        delegatedTo: {
          id: delegateUserId,
          firstName: "Delegate",
          lastName: "User",
          email: "delegate@example.com",
        },
      });
      jest.mocked(approvalRepository.createApprovalDecision).mockResolvedValue({} as never);
      jest.mocked(approvalRepository.applyWorkflowRequestApproval).mockResolvedValue({
        id: requestId,
        title: "New laptop request",
        status: "PENDING_APPROVAL",
        submittedAt,
        currentStep: { id: stepTwoId, name: "IT Approval" },
      });

      await approveWorkflowRequest(
        organisationId,
        {
          userId: delegateUserId,
          roleId: otherRoleId,
          roleName: DEFAULT_ROLE_NAMES.STAFF,
        },
        requestId,
        {},
      );

      expect(approvalRepository.createApprovalDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          approverId: delegateUserId,
          decision: "APPROVED",
        }),
        prisma,
      );
    });
  });

  describe("out-of-office approval actions", () => {
    const delegateUserId = "bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee";

    it("allows an out-of-office delegate to approve the current step", async () => {
      jest
        .mocked(approvalRepository.findWorkflowRequestForApproval)
        .mockResolvedValue({
          ...requestForApproval,
          values: [],
        });
      jest.mocked(approvalRepository.findBlockingApprovalDecisionForStep).mockResolvedValue(null);
      jest
        .mocked(outOfOfficeRepository.isActiveOutOfOfficeDelegateForRole)
        .mockResolvedValue(true);
      jest.mocked(approvalRepository.createApprovalDecision).mockResolvedValue({} as never);
      jest.mocked(approvalRepository.applyWorkflowRequestApproval).mockResolvedValue({
        id: requestId,
        title: "New laptop request",
        status: "PENDING_APPROVAL",
        submittedAt,
        currentStep: { id: stepTwoId, name: "IT Approval" },
      });

      await approveWorkflowRequest(
        organisationId,
        {
          userId: delegateUserId,
          roleId: otherRoleId,
          roleName: DEFAULT_ROLE_NAMES.STAFF,
        },
        requestId,
        {},
      );

      expect(outOfOfficeRepository.isActiveOutOfOfficeDelegateForRole).toHaveBeenCalledWith(
        organisationId,
        delegateUserId,
        approverRoleId,
      );
    });
  });
});
