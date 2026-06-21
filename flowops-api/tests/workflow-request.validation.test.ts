import {
  listWorkflowRequestsQuerySchema,
  saveDraftWorkflowRequestSchema,
  submitWorkflowRequestSchema,
  updateDraftWorkflowRequestSchema,
} from "../src/modules/workflow-requests/workflow-request.validation";

const templateId = "11111111-1111-4111-8111-111111111111";
const fieldId = "22222222-2222-4222-8222-222222222222";
const otherFieldId = "33333333-3333-4333-8333-333333333333";

describe("submitWorkflowRequestSchema", () => {
  it("accepts a valid submission body", () => {
    const result = submitWorkflowRequestSchema.safeParse({
      workflowTemplateId: templateId,
      title: "New laptop request",
      values: [{ workflowFieldId: fieldId, value: "Laptop" }],
    });

    expect(result.success).toBe(true);
  });

  it("rejects a missing workflowTemplateId", () => {
    const result = submitWorkflowRequestSchema.safeParse({
      values: [{ workflowFieldId: fieldId, value: "Laptop" }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a non-uuid workflowTemplateId", () => {
    const result = submitWorkflowRequestSchema.safeParse({
      workflowTemplateId: "not-a-uuid",
      values: [{ workflowFieldId: fieldId, value: "Laptop" }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects an empty values array on submission", () => {
    const result = submitWorkflowRequestSchema.safeParse({
      workflowTemplateId: templateId,
      values: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejects duplicate field ids", () => {
    const result = submitWorkflowRequestSchema.safeParse({
      workflowTemplateId: templateId,
      values: [
        { workflowFieldId: fieldId, value: "Laptop" },
        { workflowFieldId: fieldId, value: "Desktop" },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("accepts array and object values", () => {
    const result = submitWorkflowRequestSchema.safeParse({
      workflowTemplateId: templateId,
      values: [
        { workflowFieldId: fieldId, value: ["a", "b"] },
        { workflowFieldId: otherFieldId, value: 42 },
      ],
    });

    expect(result.success).toBe(true);
  });
});

describe("saveDraftWorkflowRequestSchema", () => {
  it("allows an empty values array for a draft", () => {
    const result = saveDraftWorkflowRequestSchema.safeParse({
      workflowTemplateId: templateId,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.values).toEqual([]);
    }
  });

  it("still requires a workflowTemplateId", () => {
    const result = saveDraftWorkflowRequestSchema.safeParse({
      values: [],
    });

    expect(result.success).toBe(false);
  });
});

describe("updateDraftWorkflowRequestSchema", () => {
  it("accepts a title-only update", () => {
    const result = updateDraftWorkflowRequestSchema.safeParse({
      title: "Updated title",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an empty update payload", () => {
    const result = updateDraftWorkflowRequestSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});

describe("listWorkflowRequestsQuerySchema", () => {
  it("defaults pagination values", () => {
    const result = listWorkflowRequestsQuerySchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it("coerces and accepts filters", () => {
    const result = listWorkflowRequestsQuerySchema.safeParse({
      status: "PENDING_APPROVAL",
      workflowTemplateId: templateId,
      search: "laptop",
      page: "3",
      limit: "5",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(5);
    }
  });

  it("rejects an unknown status", () => {
    const result = listWorkflowRequestsQuerySchema.safeParse({
      status: "NOT_A_STATUS",
    });

    expect(result.success).toBe(false);
  });
});
