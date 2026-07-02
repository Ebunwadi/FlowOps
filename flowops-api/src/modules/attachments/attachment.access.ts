import { findPermissionKeysByRoleId } from "../roles/role.repository";
import type { WorkflowRequestViewer } from "../workflow-requests/workflow-request.access";

const REQUESTS_VIEW_ALL_PERMISSION = "requests:view-all";

export async function viewerCanDeleteAttachment(
  viewer: WorkflowRequestViewer,
  attachment: { uploadedById: string },
): Promise<boolean> {
  if (attachment.uploadedById === viewer.userId) {
    return true;
  }

  const permissionKeys = await findPermissionKeysByRoleId(viewer.roleId);
  return permissionKeys.includes(REQUESTS_VIEW_ALL_PERMISSION);
}
