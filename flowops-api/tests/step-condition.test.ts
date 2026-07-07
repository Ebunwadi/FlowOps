import {
  buildRequestValuesByFieldKey,
  evaluateStepCondition,
  getFirstEligibleWorkflowStep,
  getNextEligibleWorkflowStep,
  isWorkflowStepEligible,
} from "../src/modules/approvals/step-condition";

describe("step condition evaluation", () => {
  const valuesByFieldKey = {
    urgency: "High",
    amount: 1500,
    tags: ["finance", "urgent"],
  };

  it("treats steps without a condition as eligible", () => {
    expect(isWorkflowStepEligible({ id: "step-1", stepOrder: 1 }, valuesByFieldKey)).toBe(
      true,
    );
  });

  it("evaluates equals and not_equals", () => {
    expect(
      evaluateStepCondition(
        { fieldKey: "urgency", operator: "equals", value: "High" },
        valuesByFieldKey,
      ),
    ).toBe(true);

    expect(
      evaluateStepCondition(
        { fieldKey: "urgency", operator: "not_equals", value: "Low" },
        valuesByFieldKey,
      ),
    ).toBe(true);

    expect(
      evaluateStepCondition(
        { fieldKey: "urgency", operator: "equals", value: "Low" },
        valuesByFieldKey,
      ),
    ).toBe(false);
  });

  it("evaluates contains for strings and arrays", () => {
    expect(
      evaluateStepCondition(
        { fieldKey: "urgency", operator: "contains", value: "Hi" },
        valuesByFieldKey,
      ),
    ).toBe(true);

    expect(
      evaluateStepCondition(
        { fieldKey: "tags", operator: "contains", value: "finance" },
        valuesByFieldKey,
      ),
    ).toBe(true);
  });

  it("evaluates numeric comparisons", () => {
    expect(
      evaluateStepCondition(
        { fieldKey: "amount", operator: "greater_than", value: 1000 },
        valuesByFieldKey,
      ),
    ).toBe(true);

    expect(
      evaluateStepCondition(
        { fieldKey: "amount", operator: "less_than", value: 1000 },
        valuesByFieldKey,
      ),
    ).toBe(false);
  });

  it("builds request values by field key", () => {
    expect(
      buildRequestValuesByFieldKey(
        [
          { id: "field-1", fieldKey: "urgency" },
          { id: "field-2", fieldKey: "amount" },
        ],
        [
          { workflowFieldId: "field-1", value: "High" },
          { workflowFieldId: "field-2", value: 1500 },
        ],
      ),
    ).toEqual({
      urgency: "High",
      amount: 1500,
    });
  });
});

describe("eligible workflow steps", () => {
  const steps = [
    {
      id: "manager",
      stepOrder: 10,
      condition: null,
    },
    {
      id: "director",
      stepOrder: 20,
      condition: { fieldKey: "urgency", operator: "equals", value: "High" },
    },
    {
      id: "finance",
      stepOrder: 30,
      condition: { fieldKey: "amount", operator: "greater_than", value: 1000 },
    },
  ];

  it("returns the first eligible step on submit", () => {
    expect(getFirstEligibleWorkflowStep(steps, { urgency: "Low", amount: 500 })).toMatchObject({
      id: "manager",
    });

    expect(getFirstEligibleWorkflowStep(steps, { urgency: "High", amount: 500 })).toMatchObject({
      id: "manager",
    });
  });

  it("skips ineligible steps when advancing approval", () => {
    const lowUrgencyValues = { urgency: "Low", amount: 500 };

    expect(getNextEligibleWorkflowStep(steps, "manager", lowUrgencyValues)).toBeNull();

    const highUrgencyValues = { urgency: "High", amount: 500 };

    expect(getNextEligibleWorkflowStep(steps, "manager", highUrgencyValues)).toMatchObject({
      id: "director",
    });

    const financeEligibleValues = { urgency: "Low", amount: 1500 };

    expect(getNextEligibleWorkflowStep(steps, "manager", financeEligibleValues)).toMatchObject({
      id: "finance",
    });
  });

  it("completes when remaining conditional steps do not match", () => {
    const values = { urgency: "High", amount: 500 };

    expect(getNextEligibleWorkflowStep(steps, "director", values)).toBeNull();
  });
});
