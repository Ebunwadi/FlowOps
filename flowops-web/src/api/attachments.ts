import { getRegisteredAccessToken } from "@/auth/token-access";
import { getRegisteredOrganisationId } from "@/auth/organisation-context-access";
import { env } from "@/config/env";
import { ApiClientError, type ApiResponse } from "@/types/api";
import type { WorkflowRequestAttachment } from "@/types/attachment";

async function buildAuthHeaders(
  contentType?: string,
): Promise<Record<string, string>> {
  const accessToken = await getRegisteredAccessToken();
  const organisationId = getRegisteredOrganisationId();

  return {
    ...(contentType ? { "Content-Type": contentType } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(organisationId ? { "x-organisation-id": organisationId } : {}),
  };
}

async function parseApiError(response: Response): Promise<ApiClientError> {
  try {
    const payload = (await response.json()) as ApiResponse<unknown>;

    if (payload.success === false) {
      return new ApiClientError(
        payload.message,
        response.status,
        (payload.errors ?? []).map((error) => ({
          field: error.field ?? "file",
          message: error.message,
        })),
      );
    }
  } catch {
    // Fall through to generic message.
  }

  return new ApiClientError("Request failed", response.status);
}

export function uploadWorkflowRequestAttachment(
  workflowRequestId: string,
  file: File,
): Promise<WorkflowRequestAttachment> {
  return uploadAttachment(`/workflow-requests/${workflowRequestId}/attachments`, file);
}

async function uploadAttachment(
  path: string,
  file: File,
): Promise<WorkflowRequestAttachment> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: "POST",
    headers: await buildAuthHeaders(),
    body: formData,
  });

  const payload = (await response.json()) as ApiResponse<WorkflowRequestAttachment>;

  if (!response.ok || payload.success !== true) {
    throw await parseApiError(response);
  }

  return payload.data;
}

export async function downloadAttachment(
  attachmentId: string,
  fileName: string,
): Promise<void> {
  const response = await fetch(
    `${env.apiBaseUrl}/attachments/${attachmentId}/download`,
    {
      headers: await buildAuthHeaders(),
    },
  );

  if (!response.ok) {
    throw await parseApiError(response);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  const response = await fetch(`${env.apiBaseUrl}/attachments/${attachmentId}`, {
    method: "DELETE",
    headers: await buildAuthHeaders(),
  });

  const payload = (await response.json()) as ApiResponse<null>;

  if (!response.ok || payload.success !== true) {
    throw await parseApiError(response);
  }
}
