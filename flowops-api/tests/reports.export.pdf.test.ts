import { buildRequestsPdfBuffer } from "../src/modules/reports/reports.export.pdf";

describe("reports PDF export", () => {
  it("generates a PDF buffer with summary and request rows", async () => {
    const buffer = await buildRequestsPdfBuffer({
      organisationName: "FlowOps Demo Organisation",
      generatedAt: new Date("2026-07-07T12:00:00.000Z"),
      summary: {
        totalRequests: 2,
        pendingRequests: 1,
        completedRequests: 1,
        rejectedRequests: 0,
        averageApprovalTimeHours: 12,
        overdueRequests: 0,
      },
      rows: [
        {
          id: "req-1",
          title: "New laptop",
          workflowName: "Equipment Request",
          requesterName: "Alex Staff",
          status: "PENDING_APPROVAL",
          currentStepName: "Manager Approval",
          submittedAt: "2026-06-10T10:00:00.000Z",
          completedAt: null,
          updatedAt: "2026-06-10T12:00:00.000Z",
        },
      ],
    });

    expect(buffer.subarray(0, 4).toString("utf-8")).toBe("%PDF");
    expect(buffer.byteLength).toBeGreaterThan(100);
  });
});
