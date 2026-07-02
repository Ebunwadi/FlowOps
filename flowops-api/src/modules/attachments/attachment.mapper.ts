export interface AttachmentUploaderSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export interface AttachmentResponse {
  id: string;
  workflowRequestId: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  fileExtension: string | null;
  uploadedBy: AttachmentUploaderSummary;
  createdAt: string;
  updatedAt: string;
}

export function toAttachmentResponse(attachment: {
  id: string;
  workflowRequestId: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  fileExtension: string | null;
  createdAt: Date;
  updatedAt: Date;
  uploadedBy: AttachmentUploaderSummary;
}): AttachmentResponse {
  return {
    id: attachment.id,
    workflowRequestId: attachment.workflowRequestId,
    originalFileName: attachment.originalFileName,
    mimeType: attachment.mimeType,
    fileSize: attachment.fileSize,
    fileExtension: attachment.fileExtension,
    uploadedBy: {
      id: attachment.uploadedBy.id,
      firstName: attachment.uploadedBy.firstName,
      lastName: attachment.uploadedBy.lastName,
      email: attachment.uploadedBy.email,
    },
    createdAt: attachment.createdAt.toISOString(),
    updatedAt: attachment.updatedAt.toISOString(),
  };
}
