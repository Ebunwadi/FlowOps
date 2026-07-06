import type { WorkflowRequestRequesterSummary } from "@/types/workflow-request";

export interface WorkflowRequestAttachment {
  id: string;
  workflowRequestId: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  fileExtension: string | null;
  uploadedBy: WorkflowRequestRequesterSummary;
  createdAt: string;
  updatedAt: string;
}

export const MAX_ATTACHMENT_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "docx",
  "xlsx",
  "csv",
  "txt",
] as const;

export const ALLOWED_ATTACHMENT_ACCEPT = ALLOWED_ATTACHMENT_EXTENSIONS.map(
  (extension) => `.${extension}`,
).join(",");

export function formatAttachmentFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
