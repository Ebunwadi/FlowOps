import { apiClient } from "@/api/client";
import type {
  DraftWorkflowRequestResponse,
  SaveDraftWorkflowRequestBody,
  SubmittedWorkflowRequestResponse,
  SubmitWorkflowRequestBody,
} from "@/types/workflow-request";

export function submitWorkflowRequest(
  body: SubmitWorkflowRequestBody,
): Promise<SubmittedWorkflowRequestResponse> {
  return apiClient<SubmittedWorkflowRequestResponse>("/workflow-requests", {
    method: "POST",
    body,
  });
}

export function saveDraftWorkflowRequest(
  body: SaveDraftWorkflowRequestBody,
): Promise<DraftWorkflowRequestResponse> {
  return apiClient<DraftWorkflowRequestResponse>("/workflow-requests/drafts", {
    method: "POST",
    body,
  });
}
