import { getReportsSummary } from "../src/modules/reports/reports.service";
import * as reportsRepository from "../src/modules/reports/reports.repository";

jest.mock("../src/modules/reports/reports.repository");

describe("reports service", () => {
  const organisationId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-25T12:00:00.000Z"));
    jest.clearAllMocks();

    jest.mocked(reportsRepository.countRequestsByStatus).mockImplementation(
      async (_organisationId, _range, status) => {
        switch (status) {
          case "PENDING_APPROVAL":
            return 2;
          case "APPROVED":
            return 5;
          case "REJECTED":
            return 1;
          default:
            return 8;
        }
      },
    );

    jest.mocked(reportsRepository.groupRequestsByStatus).mockResolvedValue([
      { status: "APPROVED", _count: { id: 5 } },
      { status: "PENDING_APPROVAL", _count: { id: 2 } },
      { status: "REJECTED", _count: { id: 1 } },
    ] as never);

    jest.mocked(reportsRepository.groupRequestsByWorkflowTemplate).mockResolvedValue([
      { workflowTemplateId: "template-1", _count: { id: 6 } },
      { workflowTemplateId: "template-2", _count: { id: 2 } },
    ] as never);

    jest
      .mocked(reportsRepository.findWorkflowTemplateNamesByIds)
      .mockResolvedValue([
        { id: "template-1", name: "Equipment Request" },
        { id: "template-2", name: "Leave Request" },
      ] as never);

    jest
      .mocked(reportsRepository.findSubmittedRequestDatesForMonthlyVolume)
      .mockResolvedValue([
        { submittedAt: new Date("2026-05-10T10:00:00.000Z") },
        { submittedAt: new Date("2026-06-12T10:00:00.000Z") },
        { submittedAt: new Date("2026-06-20T10:00:00.000Z") },
      ] as never);

    jest
      .mocked(reportsRepository.findCompletedRequestsForApprovalDuration)
      .mockResolvedValue([
        {
          submittedAt: new Date("2026-06-01T10:00:00.000Z"),
          completedAt: new Date("2026-06-01T22:00:00.000Z"),
        },
        {
          submittedAt: new Date("2026-06-02T10:00:00.000Z"),
          completedAt: new Date("2026-06-03T10:00:00.000Z"),
        },
      ] as never);

    jest
      .mocked(reportsRepository.findPendingRequestsForOverdueCalculation)
      .mockResolvedValue([
        {
          submittedAt: new Date("2026-06-01T10:00:00.000Z"),
          currentStep: { slaHours: 24 },
        },
        {
          submittedAt: new Date("2026-06-20T10:00:00.000Z"),
          currentStep: { slaHours: 48 },
        },
      ] as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns organisation-scoped summary metrics", async () => {
    const result = await getReportsSummary(organisationId, {});

    expect(result.totalRequests).toBe(8);
    expect(result.pendingRequests).toBe(2);
    expect(result.completedRequests).toBe(5);
    expect(result.rejectedRequests).toBe(1);
    expect(result.averageApprovalTimeHours).toBe(18);
    expect(result.overdueRequests).toBe(2);
    expect(result.requestsByWorkflow).toEqual([
      {
        workflowTemplateId: "template-1",
        workflowName: "Equipment Request",
        count: 6,
      },
      {
        workflowTemplateId: "template-2",
        workflowName: "Leave Request",
        count: 2,
      },
    ]);
    expect(result.requestsCreatedPerMonth).toEqual([
      { month: "2026-05", count: 1 },
      { month: "2026-06", count: 2 },
    ]);
  });

  it("passes date filters through to repository queries", async () => {
    const fromDate = new Date("2026-06-01T00:00:00.000Z");
    const toDate = new Date("2026-06-30T23:59:59.000Z");

    const result = await getReportsSummary(organisationId, { fromDate, toDate });

    expect(reportsRepository.countRequestsByStatus).toHaveBeenNthCalledWith(
      1,
      organisationId,
      { fromDate, toDate },
    );
    expect(result.filters).toEqual({
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
    });
  });
});
