import * as approvalRepository from "../src/modules/approvals/approval.repository";
import {
  isOrganisationOwnerRole,
  listPendingApprovals,
} from "../src/modules/approvals/approval.service";
import { DEFAULT_ROLE_NAMES } from "../src/modules/roles/default-roles";

jest.mock("../src/modules/approvals/approval.repository");

describe("approval service", () => {
  const organisationId = "550e8400-e29b-41d4-a716-446655440000";
  const approverRoleId = "44444444-4444-4444-8444-444444444444";
  const submittedAt = new Date("2026-06-20T10:00:00.000Z");

  const pendingRow = {
    id: "aaaa9999-9999-4999-8999-999999999999",
    title: "New laptop request",
    status: "PENDING_APPROVAL" as const,
    submittedAt,
    workflowTemplate: {
      id: "99999999-9999-4999-8999-999999999999",
      name: "Equipment Request",
    },
    requester: {
      id: "770e8400-e29b-41d4-a716-446655440002",
      firstName: "Alex",
      lastName: "Staff",
      email: "alex@example.com",
    },
    currentStep: {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Manager Approval",
      slaHours: 24,
      approverRoleId,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
        { roleId: approverRoleId, roleName: DEFAULT_ROLE_NAMES.MANAGER },
        { page: 1, limit: 20 },
      );

      expect(approvalRepository.findPendingApprovals).toHaveBeenCalledWith(organisationId, {
        approverRoleId,
        search: undefined,
        page: 1,
        limit: 20,
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        id: pendingRow.id,
        title: pendingRow.title,
        currentStep: { id: pendingRow.currentStep.id, name: pendingRow.currentStep.name },
        dueAt: "2026-06-21T10:00:00.000Z",
      });
    });

    it("returns all pending approvals for organisation owners", async () => {
      jest.mocked(approvalRepository.findPendingApprovals).mockResolvedValue([pendingRow]);
      jest.mocked(approvalRepository.countPendingApprovals).mockResolvedValue(1);

      await listPendingApprovals(
        organisationId,
        { roleId: approverRoleId, roleName: DEFAULT_ROLE_NAMES.OWNER },
        { page: 1, limit: 20 },
      );

      expect(approvalRepository.findPendingApprovals).toHaveBeenCalledWith(organisationId, {
        approverRoleId: undefined,
        search: undefined,
        page: 1,
        limit: 20,
      });
    });

    it("returns an empty paginated result when nothing is pending", async () => {
      jest.mocked(approvalRepository.findPendingApprovals).mockResolvedValue([]);
      jest.mocked(approvalRepository.countPendingApprovals).mockResolvedValue(0);

      const result = await listPendingApprovals(
        organisationId,
        { roleId: approverRoleId, roleName: DEFAULT_ROLE_NAMES.APPROVER },
        { page: 1, limit: 20 },
      );

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });
});
