import { findPermissionKeysByRoleId } from "../roles/role.repository";

export interface WorkflowRequestViewer {
  userId: string;
  roleId: string;
}

const REQUESTS_VIEW_ALL_PERMISSION = "requests:view-all";

export async function viewerCanAccessWorkflowRequest(
  viewer: WorkflowRequestViewer,
  request: { requesterId: string; currentStepApproverRoleId: string | null },
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

  const permissionKeys = await findPermissionKeysByRoleId(viewer.roleId);
  return permissionKeys.includes(REQUESTS_VIEW_ALL_PERMISSION);
}
