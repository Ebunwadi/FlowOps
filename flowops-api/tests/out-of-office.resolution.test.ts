import * as notificationRepository from "../src/modules/notifications/notification.repository";
import * as outOfOfficeRepository from "../src/modules/out-of-office/out-of-office.repository";
import { resolveApprovalNotificationRecipients } from "../src/modules/out-of-office/out-of-office.resolution";

jest.mock("../src/modules/out-of-office/out-of-office.repository");
jest.mock("../src/modules/notifications/notification.repository");

describe("out-of-office resolution", () => {
  const organisationId = "550e8400-e29b-41d4-a716-446655440000";
  const approverUserId = "660e8400-e29b-41d4-a716-446655440001";
  const delegateUserId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects approval notifications from an out-of-office user to their delegate", async () => {
    jest.mocked(outOfOfficeRepository.findActiveOutOfOfficeRuleForUser).mockResolvedValue({
      id: "rule-1",
      organisationId,
      userId: approverUserId,
      delegateToId: delegateUserId,
      startsAt: new Date("2026-07-01T00:00:00.000Z"),
      endsAt: new Date("2026-07-31T23:59:59.000Z"),
      isActive: true,
      createdAt: new Date("2026-07-01T10:00:00.000Z"),
      delegateTo: {
        id: delegateUserId,
        firstName: "Dana",
        lastName: "Delegate",
        email: "delegate@example.com",
      },
      user: {
        id: approverUserId,
        firstName: "Alex",
        lastName: "Approver",
        email: "approver@example.com",
      },
    });
    jest.mocked(notificationRepository.findNotificationRecipientById).mockResolvedValue({
      userId: delegateUserId,
      email: "delegate@example.com",
      firstName: "Dana",
      lastName: "Delegate",
    });

    const result = await resolveApprovalNotificationRecipients(organisationId, [
      {
        userId: approverUserId,
        email: "approver@example.com",
        firstName: "Alex",
        lastName: "Approver",
      },
    ]);

    expect(result.recipients).toEqual([
      {
        userId: delegateUserId,
        email: "delegate@example.com",
        firstName: "Dana",
        lastName: "Delegate",
      },
    ]);
    expect(result.reassignments).toEqual([
      {
        outOfOfficeUserId: approverUserId,
        delegateToId: delegateUserId,
      },
    ]);
  });
});
