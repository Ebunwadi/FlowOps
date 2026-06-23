import {
  APPROVAL_COMMENT_MAX_LENGTH,
  approveWorkflowRequestSchema,
  createWorkflowRequestCommentSchema,
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

  it("rejects a comment that exceeds the maximum length", () => {
    const result = rejectWorkflowRequestSchema.safeParse({
      comment: "a".repeat(APPROVAL_COMMENT_MAX_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });
});

describe("requestChangesWorkflowRequestSchema", () => {
  it("requires a comment", () => {
    const result = requestChangesWorkflowRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts a valid request-changes comment", () => {
    const result = requestChangesWorkflowRequestSchema.safeParse({
      comment: "Please provide a clearer business justification.",
    });
    expect(result.success).toBe(true);
  });
});

describe("createWorkflowRequestCommentSchema", () => {
  it("requires content", () => {
    const result = createWorkflowRequestCommentSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects blank content", () => {
    const result = createWorkflowRequestCommentSchema.safeParse({ content: "  " });
    expect(result.success).toBe(false);
  });

  it("accepts valid comment content", () => {
    const result = createWorkflowRequestCommentSchema.safeParse({
      content: "Can you clarify the budget code?",
    });
    expect(result.success).toBe(true);
  });

  it("rejects content that exceeds the maximum length", () => {
    const result = createWorkflowRequestCommentSchema.safeParse({
      content: "a".repeat(APPROVAL_COMMENT_MAX_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });
});

describe("workflowRequestApprovalParamsSchema", () => {
  it("accepts a valid request id", () => {
    const result = workflowRequestApprovalParamsSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid id", () => {
    const result = workflowRequestApprovalParamsSchema.safeParse({ id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});
