import {
  APPROVAL_COMMENT_MAX_LENGTH,
  approveWorkflowRequestSchema,
  createWorkflowRequestCommentSchema,
  listPendingApprovalsQuerySchema,
  rejectWorkflowRequestSchema,
  requestChangesWorkflowRequestSchema,
  workflowRequestApprovalParamsSchema,
} from "../src/modules/approvals/approval.validation";

describe("approveWorkflowRequestSchema", () => {
  it("accepts an empty body", () => {
    const result = approveWorkflowRequestSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts an optional comment", () => {
    const result = approveWorkflowRequestSchema.safeParse({
      comment: "Approved. This request is valid.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a comment that exceeds the maximum length", () => {
    const result = approveWorkflowRequestSchema.safeParse({
      comment: "a".repeat(APPROVAL_COMMENT_MAX_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });
});

describe("rejectWorkflowRequestSchema", () => {
  it("requires a comment", () => {
    const result = rejectWorkflowRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a blank comment", () => {
    const result = rejectWorkflowRequestSchema.safeParse({ comment: "   " });
    expect(result.success).toBe(false);
  });

  it("accepts a valid rejection comment", () => {
    const result = rejectWorkflowRequestSchema.safeParse({
      comment: "Rejected because the business reason is unclear.",
    });
    expect(result.success).toBe(true);
  });
});

describe("requestChangesWorkflowRequestSchema", () => {
  it("requires a comment", () => {
    const result = requestChangesWorkflowRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("createWorkflowRequestCommentSchema", () => {
  it("requires content", () => {
    const result = createWorkflowRequestCommentSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("listPendingApprovalsQuerySchema", () => {
  it("defaults pagination values", () => {
    const result = listPendingApprovalsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it("accepts search and pagination overrides", () => {
    const result = listPendingApprovalsQuerySchema.safeParse({
      search: "laptop",
      page: 2,
      limit: 10,
    });
    expect(result.success).toBe(true);
  });
});

describe("workflowRequestApprovalParamsSchema", () => {
  it("accepts a valid request id", () => {
    const result = workflowRequestApprovalParamsSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
    });
    expect(result.success).toBe(true);
  });
});
