import path from "node:path";

export function sanitizeAttachmentFileName(originalFileName: string): string {
  const baseName = path.basename(originalFileName).trim();
  const sanitized = baseName.replace(/[^a-zA-Z0-9._-]+/g, "_");

  if (sanitized.length === 0) {
    return "attachment";
  }

  return sanitized.slice(0, 200);
}

export function buildAttachmentStoredFileName(
  attachmentId: string,
  originalFileName: string,
): string {
  return `${attachmentId}-${sanitizeAttachmentFileName(originalFileName)}`;
}

export function buildAttachmentStorageKey(input: {
  organisationId: string;
  workflowRequestId: string;
  storedFileName: string;
}): string {
  return `organisations/${input.organisationId}/requests/${input.workflowRequestId}/attachments/${input.storedFileName}`;
}
