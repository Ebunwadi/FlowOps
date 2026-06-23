import { toWorkflowRequestApprovalHistoryItem } from "../src/modules/approvals/approval.mapper";

describe("approval mapper", () => {
  describe("toWorkflowRequestApprovalHistoryItem", () => {
    it("maps approval records for request detail responses", () => {
      const decidedAt = new Date("2026-06-20T14:00:00.000Z");

      const result = toWorkflowRequestApprovalHistoryItem({
        id: "bbbb8888-8888-4888-8888-888888888888",
        decision: "CHANGES_REQUESTED",
        comment: "Please add a cost breakdown.",
        decidedAt,
        workflowStep: {
          id: "33333333-3333-4333-8333-333333333333",
          name: "Manager Approval",
          stepOrder: 1,
        },
        approver: {
          id: "660e8400-e29b-41d4-a716-446655440001",
          firstName: "Grace",
          lastName: "Hopper",
          email: "grace@example.com",
        },
      });

      expect(result).toEqual({
        id: "bbbb8888-8888-4888-8888-888888888888",
        step: {
          id: "33333333-3333-4333-8333-333333333333",
          name: "Manager Approval",
          stepOrder: 1,
        },
        approver: {
          id: "660e8400-e29b-41d4-a716-446655440001",
          firstName: "Grace",
          lastName: "Hopper",
          email: "grace@example.com",
        },
        decision: "CHANGES_REQUESTED",
        comment: "Please add a cost breakdown.",
        decidedAt: decidedAt.toISOString(),
      });
    });
  });
});
