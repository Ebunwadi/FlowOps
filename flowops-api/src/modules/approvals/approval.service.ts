import { DEFAULT_ROLE_NAMES } from "../roles/default-roles";
import {
  toPendingApprovalListItem,
  type PaginatedPendingApprovalsResponse,
} from "./approval.mapper";
import {
  countPendingApprovals,
  findPendingApprovals,
} from "./approval.repository";
import type { ListPendingApprovalsQuery } from "./approval.validation";

export interface PendingApprovalViewer {
  roleId: string;
  roleName: string;
}

export function isOrganisationOwnerRole(roleName: string): boolean {
  return roleName === DEFAULT_ROLE_NAMES.OWNER;
}

export async function listPendingApprovals(
  organisationId: string,
  viewer: PendingApprovalViewer,
  query: ListPendingApprovalsQuery,
): Promise<PaginatedPendingApprovalsResponse> {
  const includeAllPending = isOrganisationOwnerRole(viewer.roleName);

  const filters = {
    approverRoleId: includeAllPending ? undefined : viewer.roleId,
    search: query.search,
    page: query.page,
    limit: query.limit,
  };

  const [requests, total] = await Promise.all([
    findPendingApprovals(organisationId, filters),
    countPendingApprovals(organisationId, filters),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

  return {
    items: requests.map(toPendingApprovalListItem),
    page: query.page,
    limit: query.limit,
    total,
    totalPages,
  };
}
