type ApprovalDelegationRecord = {
  id: string;
  organisationId: string;
  workflowRequestId: string;
  workflowStepId: string;
  reason: string | null;
  createdAt: Date;
  delegatedBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  delegatedTo: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
};

export interface ApprovalDelegationUserSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export interface ApprovalDelegationResponse {
  id: string;
  organisationId: string;
  workflowRequestId: string;
  workflowStepId: string;
  reason: string | null;
  createdAt: string;
  delegatedBy: ApprovalDelegationUserSummary;
  delegatedTo: ApprovalDelegationUserSummary;
}

function toUserSummary(user: ApprovalDelegationUserSummary): ApprovalDelegationUserSummary {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  };
}

export function toApprovalDelegationResponse(
  record: ApprovalDelegationRecord,
): ApprovalDelegationResponse {
  return {
    id: record.id,
    organisationId: record.organisationId,
    workflowRequestId: record.workflowRequestId,
    workflowStepId: record.workflowStepId,
    reason: record.reason,
    createdAt: record.createdAt.toISOString(),
    delegatedBy: toUserSummary(record.delegatedBy),
    delegatedTo: toUserSummary(record.delegatedTo),
  };
}
