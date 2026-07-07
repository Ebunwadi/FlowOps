import { buildRequestsCsvContent } from "../src/modules/reports/reports.export.csv";

describe("reports CSV export", () => {
  it("includes required columns and escapes comma-containing values", () => {
    const csv = buildRequestsCsvContent([
      {
        id: "req-1",
        title: "Laptop, monitor",
        workflowName: "Equipment Request",
        requesterName: "Alex Staff",
        status: "PENDING_APPROVAL",
        currentStepName: "Manager Approval",
        submittedAt: "2026-06-10T10:00:00.000Z",
        completedAt: null,
        updatedAt: "2026-06-10T12:00:00.000Z",
      },
    ]);

    expect(csv).toContain(
      "Request ID,Title,Workflow,Requester,Status,Current step,Submitted date,Completed date,Last updated",
    );
    expect(csv).toContain('"Laptop, monitor"');
    expect(csv).toContain("req-1");
    expect(csv).toContain("Equipment Request");
    expect(csv).toContain("2026-06-10T10:00:00.000Z");
  });
});
