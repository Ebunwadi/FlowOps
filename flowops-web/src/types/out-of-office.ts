export interface OutOfOfficeUserSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export interface OutOfOfficeRule {
  id: string;
  delegateTo: OutOfOfficeUserSummary;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateOutOfOfficeRuleInput {
  delegateToId: string;
  startsAt: string;
  endsAt: string;
  isActive?: boolean;
}

export interface UpdateOutOfOfficeRuleInput {
  delegateToId?: string;
  startsAt?: string;
  endsAt?: string;
  isActive?: boolean;
}

export function formatOutOfOfficeUserName(user: OutOfOfficeUserSummary): string {
  const parts = [user.firstName, user.lastName].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(" ");
  }

  return user.email;
}

export type OutOfOfficeRuleStatus =
  | "active"
  | "scheduled"
  | "expired"
  | "disabled";

export function getOutOfOfficeRuleStatus(rule: OutOfOfficeRule): OutOfOfficeRuleStatus {
  if (!rule.isActive) {
    return "disabled";
  }

  const now = Date.now();
  const startsAt = Date.parse(rule.startsAt);
  const endsAt = Date.parse(rule.endsAt);

  if (endsAt < now) {
    return "expired";
  }

  if (startsAt > now) {
    return "scheduled";
  }

  return "active";
}

export function formatOutOfOfficeRuleStatus(status: OutOfOfficeRuleStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "scheduled":
      return "Scheduled";
    case "expired":
      return "Expired";
    case "disabled":
      return "Disabled";
  }
}
