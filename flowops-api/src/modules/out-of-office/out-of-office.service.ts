import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "../../common/errors/httpErrors";
import { logger } from "../../config/logger";
import { findActiveOrganisationMemberByUserId } from "../approvals/approval-delegation.repository";
import { toOutOfOfficeRuleResponse, type OutOfOfficeRuleResponse } from "./out-of-office.mapper";
import {
  createOutOfOfficeRuleRecord,
  findOutOfOfficeRuleById,
  findOutOfOfficeRulesForUser,
  updateOutOfOfficeRuleRecord,
} from "./out-of-office.repository";
import type {
  CreateOutOfOfficeRuleBody,
  UpdateOutOfOfficeRuleBody,
} from "./out-of-office.validation";

function assertValidDateRange(startsAt: Date, endsAt: Date): void {
  if (startsAt >= endsAt) {
    throw new ValidationError("Out-of-office start must be before end");
  }
}

async function assertDelegateIsActiveMember(
  organisationId: string,
  delegateToId: string,
): Promise<void> {
  const membership = await findActiveOrganisationMemberByUserId(
    organisationId,
    delegateToId,
  );

  if (!membership) {
    throw new ValidationError("Delegate must be an active organisation member");
  }
}

export async function listOutOfOfficeRules(
  organisationId: string,
  userId: string,
): Promise<OutOfOfficeRuleResponse[]> {
  const rules = await findOutOfOfficeRulesForUser(organisationId, userId);
  return rules.map(toOutOfOfficeRuleResponse);
}

export async function createOutOfOfficeRule(
  organisationId: string,
  userId: string,
  input: CreateOutOfOfficeRuleBody,
): Promise<OutOfOfficeRuleResponse> {
  if (input.delegateToId === userId) {
    throw new ValidationError("You cannot assign yourself as your out-of-office delegate");
  }

  assertValidDateRange(input.startsAt, input.endsAt);
  await assertDelegateIsActiveMember(organisationId, input.delegateToId);

  const rule = await createOutOfOfficeRuleRecord({
    organisationId,
    userId,
    delegateToId: input.delegateToId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    isActive: input.isActive,
  });

  logger.info(
    {
      origin: "api",
      event: "out_of_office_rule.created",
      organisationId,
      userId,
      ruleId: rule.id,
      delegateToId: input.delegateToId,
    },
    "[API] Out-of-office rule created",
  );

  return toOutOfOfficeRuleResponse(rule);
}

export async function updateOutOfOfficeRule(
  organisationId: string,
  userId: string,
  ruleId: string,
  input: UpdateOutOfOfficeRuleBody,
): Promise<OutOfOfficeRuleResponse> {
  const existingRule = await findOutOfOfficeRuleById(organisationId, ruleId);

  if (!existingRule) {
    throw new NotFoundError("Out-of-office rule not found");
  }

  if (existingRule.userId !== userId) {
    throw new AuthorizationError("You can only update your own out-of-office rules");
  }

  const nextStartsAt = input.startsAt ?? existingRule.startsAt;
  const nextEndsAt = input.endsAt ?? existingRule.endsAt;
  assertValidDateRange(nextStartsAt, nextEndsAt);

  if (input.delegateToId !== undefined) {
    if (input.delegateToId === userId) {
      throw new ValidationError("You cannot assign yourself as your out-of-office delegate");
    }

    await assertDelegateIsActiveMember(organisationId, input.delegateToId);
  }

  const rule = await updateOutOfOfficeRuleRecord(ruleId, input);

  logger.info(
    {
      origin: "api",
      event: "out_of_office_rule.updated",
      organisationId,
      userId,
      ruleId,
      updatedFields: Object.keys(input),
    },
    "[API] Out-of-office rule updated",
  );

  return toOutOfOfficeRuleResponse(rule);
}
