import {
  assertUniqueWorkflowFields,
  assertUniqueWorkflowSteps,
  createWorkflowTemplateSchema,
  listWorkflowTemplatesQuerySchema,
  updateWorkflowTemplateSchema,
} from "../src/modules/workflows/workflow-template.validation";
import { ValidationError } from "../src/common/errors/httpErrors";

const validField = {
  label: "Reason",
  fieldKey: "reason",
  fieldType: "SHORT_TEXT" as const,
  fieldOrder: 1,
};

const validStep = {
  name: "Manager approval",
  stepOrder: 1,
  approverRoleId: "11111111-1111-4111-8111-111111111111",
};

const validCreatePayload = {
  name: "Leave request",
  description: "Submit annual leave",
  category: "HR",
  fields: [validField],
  steps: [validStep],
};

describe("createWorkflowTemplateSchema", () => {
  it("accepts a valid workflow template payload", () => {
    const result = createWorkflowTemplateSchema.safeParse(validCreatePayload);

    expect(result.success).toBe(true);
  });

  it("rejects a template without form fields", () => {
    const result = createWorkflowTemplateSchema.safeParse({
      ...validCreatePayload,
      fields: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a template without approval steps", () => {
    const result = createWorkflowTemplateSchema.safeParse({
      ...validCreatePayload,
      steps: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejects duplicate fieldOrder values", () => {
    const result = createWorkflowTemplateSchema.safeParse({
      ...validCreatePayload,
      fields: [
        validField,
        {
          ...validField,
          label: "Notes",
          fieldKey: "notes",
          fieldOrder: 1,
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes("fieldOrder"))).toBe(
        true,
      );
    }
  });

  it("rejects duplicate fieldKey values", () => {
    const result = createWorkflowTemplateSchema.safeParse({
      ...validCreatePayload,
      fields: [
        validField,
        {
          ...validField,
          label: "Reason duplicate",
          fieldOrder: 2,
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes("fieldKey"))).toBe(
        true,
      );
    }
  });

  it("rejects duplicate stepOrder values", () => {
    const result = createWorkflowTemplateSchema.safeParse({
      ...validCreatePayload,
      steps: [
        validStep,
        {
          ...validStep,
          name: "Finance approval",
          stepOrder: 1,
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes("stepOrder"))).toBe(
        true,
      );
    }
  });

  it("rejects an invalid field type", () => {
    const result = createWorkflowTemplateSchema.safeParse({
      ...validCreatePayload,
      fields: [
        {
          ...validField,
          fieldType: "INVALID",
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a name that is too short", () => {
    const result = createWorkflowTemplateSchema.safeParse({
      ...validCreatePayload,
      name: "HR",
    });

    expect(result.success).toBe(false);
  });
});

describe("listWorkflowTemplatesQuerySchema", () => {
  it("accepts pagination and filter query params", () => {
    const result = listWorkflowTemplatesQuerySchema.safeParse({
      search: "equipment",
      status: "DRAFT",
      category: "IT",
      page: "2",
      limit: "10",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(10);
    }
  });

  it("defaults pagination values", () => {
    const result = listWorkflowTemplatesQuerySchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });
});

describe("updateWorkflowTemplateSchema", () => {
  it("accepts a partial update payload", () => {
    const result = updateWorkflowTemplateSchema.safeParse({
      name: "Updated leave request",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an empty update payload", () => {
    const result = updateWorkflowTemplateSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("validates fields when provided on update", () => {
    const result = updateWorkflowTemplateSchema.safeParse({
      fields: [],
    });

    expect(result.success).toBe(false);
  });
});

describe("workflow template service validation helpers", () => {
  it("throws when field orders are duplicated", () => {
    expect(() =>
      assertUniqueWorkflowFields([
        { fieldKey: "reason", fieldOrder: 1 },
        { fieldKey: "notes", fieldOrder: 1 },
      ]),
    ).toThrow(ValidationError);
  });

  it("throws when step orders are duplicated", () => {
    expect(() =>
      assertUniqueWorkflowSteps([
        { stepOrder: 1 },
        { stepOrder: 1 },
      ]),
    ).toThrow(ValidationError);
  });
});
