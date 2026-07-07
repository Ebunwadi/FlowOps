import type { OutOfOfficeRuleRecord } from "./out-of-office.repository";

export interface OutOfOfficeUserSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export interface OutOfOfficeRuleResponse {
  id: string;
  delegateTo: OutOfOfficeUserSummary;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  createdAt: string;
}

function toOutOfOfficeUserSummary(user: {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}): OutOfOfficeUserSummary {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  };
}

export function toOutOfOfficeRuleResponse(
  rule: OutOfOfficeRuleRecord,
): OutOfOfficeRuleResponse {
  return {
    id: rule.id,
    delegateTo: toOutOfOfficeUserSummary(rule.delegateTo),
    startsAt: rule.startsAt.toISOString(),
    endsAt: rule.endsAt.toISOString(),
    isActive: rule.isActive,
    createdAt: rule.createdAt.toISOString(),
  };
}
