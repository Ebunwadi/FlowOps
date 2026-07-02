import path from "node:path";

import type { ErrorDetail } from "../../common/errors/appError";
import { ValidationError } from "../../common/errors/httpErrors";

export const MAX_ATTACHMENT_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_ATTACHMENT_TYPES = [
  {
    extensions: ["pdf"],
    mimeTypes: ["application/pdf"],
  },
  {
    extensions: ["png"],
    mimeTypes: ["image/png"],
  },
  {
    extensions: ["jpg", "jpeg"],
    mimeTypes: ["image/jpeg"],
  },
  {
    extensions: ["docx"],
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
  {
    extensions: ["xlsx"],
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
  },
  {
    extensions: ["csv"],
    mimeTypes: ["text/csv", "application/csv", "application/vnd.ms-excel"],
  },
  {
    extensions: ["txt"],
    mimeTypes: ["text/plain"],
  },
] as const;

const ALLOWED_EXTENSIONS = new Set<string>(
  ALLOWED_ATTACHMENT_TYPES.flatMap((entry) => entry.extensions),
);

const ALLOWED_MIME_TYPES = new Set<string>(
  ALLOWED_ATTACHMENT_TYPES.flatMap((entry) => entry.mimeTypes),
);

export interface AttachmentUploadInput {
  originalFileName: string;
  buffer: Buffer | null | undefined;
  mimeType: string;
}

export interface ValidatedAttachmentUpload {
  originalFileName: string;
  buffer: Buffer;
  mimeType: string;
  fileSize: number;
  fileExtension: string | null;
}

function normalizeMimeType(mimeType: string): string {
  return mimeType.trim().toLowerCase().split(";")[0]?.trim() ?? "";
}

function extractFileExtension(originalFileName: string): string | null {
  const extension = path.extname(originalFileName).replace(/^\./, "").toLowerCase();
  return extension.length > 0 ? extension : null;
}

function mimeMatchesExtension(mimeType: string, extension: string): boolean {
  return ALLOWED_ATTACHMENT_TYPES.some(
    (entry) =>
      (entry.extensions as readonly string[]).includes(extension) &&
      (entry.mimeTypes as readonly string[]).includes(mimeType),
  );
}

function formatAllowedTypesMessage(): string {
  return ALLOWED_ATTACHMENT_TYPES.map((entry) => entry.extensions.join("/")).join(
    ", ",
  );
}

/**
 * Validates an attachment upload before it is stored in object storage or persisted.
 * Organisation and workflow-request access checks happen in the attachment service.
 */
export function validateAttachmentUpload(
  input: AttachmentUploadInput,
): ValidatedAttachmentUpload {
  const errors: ErrorDetail[] = [];
  const originalFileName = input.originalFileName.trim();
  const mimeType = normalizeMimeType(input.mimeType);
  const buffer = input.buffer ?? null;
  const fileSize = buffer?.byteLength ?? 0;
  const fileExtension = originalFileName
    ? extractFileExtension(originalFileName)
    : null;

  if (!originalFileName) {
    errors.push({
      field: "file",
      message: "A file name is required",
    });
  }

  if (!buffer || fileSize === 0) {
    errors.push({
      field: "file",
      message: "A file is required",
    });
  }

  if (fileSize > MAX_ATTACHMENT_FILE_SIZE_BYTES) {
    errors.push({
      field: "file",
      message: "File size must not exceed 10MB",
    });
  }

  if (!mimeType) {
    errors.push({
      field: "mimeType",
      message: "File type is required",
    });
  } else if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    errors.push({
      field: "mimeType",
      message: `Unsupported file type. Allowed types: ${formatAllowedTypesMessage()}`,
    });
  }

  if (!fileExtension) {
    errors.push({
      field: "file",
      message: "File must have an allowed extension",
    });
  } else if (!ALLOWED_EXTENSIONS.has(fileExtension)) {
    errors.push({
      field: "file",
      message: `Unsupported file extension. Allowed types: ${formatAllowedTypesMessage()}`,
    });
  }

  if (
    mimeType &&
    fileExtension &&
    ALLOWED_MIME_TYPES.has(mimeType) &&
    ALLOWED_EXTENSIONS.has(fileExtension) &&
    !mimeMatchesExtension(mimeType, fileExtension)
  ) {
    errors.push({
      field: "file",
      message: "File extension does not match the uploaded file type",
    });
  }

  if (errors.length > 0) {
    throw new ValidationError("Attachment upload is invalid", errors);
  }

  return {
    originalFileName,
    buffer: buffer as Buffer,
    mimeType,
    fileSize,
    fileExtension,
  };
}
