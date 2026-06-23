import { getNextWorkflowStep } from "../src/modules/approvals/approval.helpers";

describe("getNextWorkflowStep", () => {
  const steps = [
    { id: "step-1", stepOrder: 10, name: "Manager" },
    { id: "step-2", stepOrder: 20, name: "IT" },
    { id: "step-3", stepOrder: 30, name: "Procurement" },
  ];

  it("returns the next step by sorted stepOrder", () => {
    expect(getNextWorkflowStep(steps, "step-1")).toMatchObject({ id: "step-2" });
    expect(getNextWorkflowStep(steps, "step-2")).toMatchObject({ id: "step-3" });
  });

  it("returns null when the current step is the last step", () => {
    expect(getNextWorkflowStep(steps, "step-3")).toBeNull();
  });

  it("returns null when the current step id is unknown", () => {
    expect(getNextWorkflowStep(steps, "missing")).toBeNull();
  });
});
