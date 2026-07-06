import {
  ALLOWED_ATTACHMENT_EXTENSIONS,
  MAX_ATTACHMENT_FILE_SIZE_BYTES,
} from "@/types/attachment";

const ALLOWED_EXTENSION_SET = new Set<string>(ALLOWED_ATTACHMENT_EXTENSIONS);

const EXTENSION_MIME_MAP: Record<string, readonly string[]> = {
  pdf: ["application/pdf"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  xlsx: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  csv: ["text/csv", "application/csv", "application/vnd.ms-excel"],
  txt: ["text/plain"],
};

function extractExtension(fileName: string): string | null {
  const parts = fileName.trim().split(".");
  if (parts.length < 2) {
    return null;
  }

  const extension = parts.at(-1)?.toLowerCase();
  return extension && extension.length > 0 ? extension : null;
}

function normalizeMimeType(mimeType: string): string {
  return mimeType.trim().toLowerCase().split(";")[0]?.trim() ?? "";
}

export function validateAttachmentFile(file: File): string | null {
  const extension = extractExtension(file.name);

  if (!extension || !ALLOWED_EXTENSION_SET.has(extension)) {
    return `Unsupported file type. Allowed types: ${ALLOWED_ATTACHMENT_EXTENSIONS.join(", ")}.`;
  }

  if (file.size === 0) {
    return "A file is required.";
  }

  if (file.size > MAX_ATTACHMENT_FILE_SIZE_BYTES) {
    return "File size must not exceed 10MB.";
  }

  const mimeType = normalizeMimeType(file.type);
  const allowedMimeTypes = EXTENSION_MIME_MAP[extension] ?? [];

  if (mimeType && !allowedMimeTypes.includes(mimeType)) {
    return "File extension does not match the selected file type.";
  }

  return null;
}
