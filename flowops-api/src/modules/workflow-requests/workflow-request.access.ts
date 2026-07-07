import { findPermissionKeysByRoleId } from "../roles/role.repository";
import { findApprovalDelegationForRequestStep } from "../approvals/approval-delegation.repository";
import { isActiveOutOfOfficeDelegateForRole } from "../out-of-office/out-of-office.repository";
export interface WorkflowRequestViewer {
  userId: string;
  roleId: string;
}

const REQUESTS_VIEW_ALL_PERMISSION = "requests:view-all";

export async function viewerCanAccessWorkflowRequest(
  organisationId: string,
  viewer: WorkflowRequestViewer,
  request: {
    requesterId: string;
    currentStepApproverRoleId: string | null;
    workflowRequestId?: string;
    currentStepId?: string | null;
  },
): Promise<boolean> {
  if (request.requesterId === viewer.userId) {
    return true;
  }

  if (
    request.currentStepApproverRoleId !== null &&
    request.currentStepApproverRoleId === viewer.roleId
  ) {
    return true;
  }

  if (request.workflowRequestId && request.currentStepId) {
    const delegation = await findApprovalDelegationForRequestStep(
      request.workflowRequestId,
      request.currentStepId,
    );

    if (delegation?.delegatedTo.id === viewer.userId) {
      return true;
    }
  }

  if (
    request.currentStepApproverRoleId !== null &&
    (await isActiveOutOfOfficeDelegateForRole(
      organisationId,
      viewer.userId,
      request.currentStepApproverRoleId,
    ))
  ) {
    return true;
  }

  const permissionKeys = await findPermissionKeysByRoleId(viewer.roleId);
  return permissionKeys.includes(REQUESTS_VIEW_ALL_PERMISSION);
}
