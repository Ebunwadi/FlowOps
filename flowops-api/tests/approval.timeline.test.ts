import { buildWorkflowRequestTimeline } from "../src/modules/approvals/approval.timeline";

describe("buildWorkflowRequestTimeline", () => {
  const managerStep = {
    id: "step-manager",
    name: "Manager Approval",
    stepOrder: 1,
  };
  const itStep = {
    id: "step-it",
    name: "IT Approval",
    stepOrder: 2,
  };
  const procurementStep = {
    id: "step-procurement",
    name: "Procurement Approval",
    stepOrder: 3,
  };
  const steps = [managerStep, itStep, procurementStep];

  const managerApproval = {
    decision: "APPROVED" as const,
    comment: "Approved",
    decidedAt: new Date("2026-06-20T10:00:00.000Z"),
    workflowStep: { id: managerStep.id },
    approver: {
      firstName: "Sarah",
      lastName: "Manager",
      email: "sarah@example.com",
    },
  };

  it("shows approved, current, and waiting steps for an in-progress request", () => {
    const timeline = buildWorkflowRequestTimeline({
      requestStatus: "PENDING_APPROVAL",
      currentStepId: itStep.id,
      steps,
      approvals: [managerApproval],
    });

    expect(timeline).toEqual([
      {
        stepId: managerStep.id,
        stepName: "Manager Approval",
        stepOrder: 1,
        status: "APPROVED",
        actor: "Sarah Manager",
        date: "2026-06-20T10:00:00.000Z",
        comment: "Approved",
      },
      {
        stepId: itStep.id,
        stepName: "IT Approval",
        stepOrder: 2,
        status: "CURRENT",
        actor: null,
        date: null,
        comment: null,
      },
      {
        stepId: procurementStep.id,
        stepName: "Procurement Approval",
        stepOrder: 3,
        status: "WAITING",
        actor: null,
        date: null,
        comment: null,
      },
    ]);
  });

  it("marks future steps as skipped after a rejection", () => {
    const timeline = buildWorkflowRequestTimeline({
      requestStatus: "REJECTED",
      currentStepId: null,
      steps,
      approvals: [
        managerApproval,
        {
          decision: "REJECTED",
          comment: "Budget not approved.",
          decidedAt: new Date("2026-06-21T09:00:00.000Z"),
          workflowStep: { id: itStep.id },
          approver: {
            firstName: "Ian",
            lastName: "Tech",
            email: "ian@example.com",
          },
        },
      ],
    });

    expect(timeline[1]?.status).toBe("REJECTED");
    expect(timeline[2]?.status).toBe("SKIPPED");
  });

  it("marks future steps as skipped after changes are requested", () => {
    const timeline = buildWorkflowRequestTimeline({
      requestStatus: "CHANGES_REQUESTED",
      currentStepId: null,
      steps,
      approvals: [
        {
          decision: "CHANGES_REQUESTED",
          comment: "Please add a cost breakdown.",
          decidedAt: new Date("2026-06-21T09:00:00.000Z"),
          workflowStep: { id: managerStep.id },
          approver: {
            firstName: "Sarah",
            lastName: "Manager",
            email: "sarah@example.com",
          },
        },
      ],
    });

    expect(timeline[0]?.status).toBe("CHANGES_REQUESTED");
    expect(timeline[1]?.status).toBe("SKIPPED");
    expect(timeline[2]?.status).toBe("SKIPPED");
  });

  it("shows all steps as waiting for draft requests", () => {
    const timeline = buildWorkflowRequestTimeline({
      requestStatus: "DRAFT",
      currentStepId: null,
      steps,
      approvals: [],
    });

    expect(timeline.every((item) => item.status === "WAITING")).toBe(true);
  });

  it("uses the approver email when no display name is available", () => {
    const timeline = buildWorkflowRequestTimeline({
      requestStatus: "PENDING_APPROVAL",
      currentStepId: itStep.id,
      steps: [managerStep, itStep],
      approvals: [
        {
          ...managerApproval,
          approver: {
            firstName: null,
            lastName: null,
            email: "sarah@example.com",
          },
        },
      ],
    });

    expect(timeline[0]?.actor).toBe("sarah@example.com");
  });
});
