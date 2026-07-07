import { ValidationError } from "../src/common/errors/httpErrors";
import * as approvalDelegationRepository from "../src/modules/approvals/approval-delegation.repository";
import * as outOfOfficeRepository from "../src/modules/out-of-office/out-of-office.repository";
import {
  createOutOfOfficeRule,
  updateOutOfOfficeRule,
} from "../src/modules/out-of-office/out-of-office.service";

jest.mock("../src/modules/approvals/approval-delegation.repository");
jest.mock("../src/modules/out-of-office/out-of-office.repository");

describe("out-of-office service", () => {
  const organisationId = "550e8400-e29b-41d4-a716-446655440000";
  const userId = "770e8400-e29b-41d4-a716-446655440002";
  const delegateUserId = "660e8400-e29b-41d4-a716-446655440001";
  const ruleId = "88888888-8888-4888-8888-888888888888";

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(approvalDelegationRepository.findActiveOrganisationMemberByUserId)
      .mockResolvedValue({
        id: "member-2",
        userId: delegateUserId,
        roleId: "44444444-4444-4444-8444-444444444444",
      });
  });

  it("rejects creating a rule when the delegate is the same user", async () => {
    await expect(
      createOutOfOfficeRule(organisationId, userId, {
        delegateToId: userId,
        startsAt: new Date("2026-07-01T00:00:00.000Z"),
        endsAt: new Date("2026-07-31T23:59:59.000Z"),
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("creates a rule for an active delegate", async () => {
    jest.mocked(outOfOfficeRepository.createOutOfOfficeRuleRecord).mockResolvedValue({
      id: ruleId,
      organisationId,
      userId,
      delegateToId: delegateUserId,
      startsAt: new Date("2026-07-01T00:00:00.000Z"),
      endsAt: new Date("2026-07-31T23:59:59.000Z"),
      isActive: true,
      createdAt: new Date("2026-07-01T10:00:00.000Z"),
      delegateTo: {
        id: delegateUserId,
        firstName: "Alex",
        lastName: "Delegate",
        email: "delegate@example.com",
      },
      user: {
        id: userId,
        firstName: "Test",
        lastName: "User",
        email: "test.user@flowops.local",
      },
    });

    const result = await createOutOfOfficeRule(organisationId, userId, {
      delegateToId: delegateUserId,
      startsAt: new Date("2026-07-01T00:00:00.000Z"),
      endsAt: new Date("2026-07-31T23:59:59.000Z"),
    });

    expect(result.delegateTo.id).toBe(delegateUserId);
    expect(outOfOfficeRepository.createOutOfOfficeRuleRecord).toHaveBeenCalled();
  });

  it("allows the owner to disable their rule", async () => {
    jest.mocked(outOfOfficeRepository.findOutOfOfficeRuleById).mockResolvedValue({
      id: ruleId,
      organisationId,
      userId,
      delegateToId: delegateUserId,
      startsAt: new Date("2026-07-01T00:00:00.000Z"),
      endsAt: new Date("2026-07-31T23:59:59.000Z"),
      isActive: true,
      createdAt: new Date("2026-07-01T10:00:00.000Z"),
      delegateTo: {
        id: delegateUserId,
        firstName: "Alex",
        lastName: "Delegate",
        email: "delegate@example.com",
      },
      user: {
        id: userId,
        firstName: "Test",
        lastName: "User",
        email: "test.user@flowops.local",
      },
    });
    jest.mocked(outOfOfficeRepository.updateOutOfOfficeRuleRecord).mockResolvedValue({
      id: ruleId,
      organisationId,
      userId,
      delegateToId: delegateUserId,
      startsAt: new Date("2026-07-01T00:00:00.000Z"),
      endsAt: new Date("2026-07-31T23:59:59.000Z"),
      isActive: false,
      createdAt: new Date("2026-07-01T10:00:00.000Z"),
      delegateTo: {
        id: delegateUserId,
        firstName: "Alex",
        lastName: "Delegate",
        email: "delegate@example.com",
      },
      user: {
        id: userId,
        firstName: "Test",
        lastName: "User",
        email: "test.user@flowops.local",
      },
    });

    const result = await updateOutOfOfficeRule(organisationId, userId, ruleId, {
      isActive: false,
    });

    expect(result.isActive).toBe(false);
  });
});
