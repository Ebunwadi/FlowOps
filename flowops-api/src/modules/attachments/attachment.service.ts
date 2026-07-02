import type { Readable } from "node:stream";

import { randomUUID } from "node:crypto";

import {
  AuthorizationError,
  NotFoundError,
} from "../../common/errors/httpErrors";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { StorageObjectNotFoundError } from "../storage/storage.errors";
import { deleteFile, downloadFile, uploadFile } from "../storage/storage.service";
import {
  viewerCanAccessWorkflowRequest,
  type WorkflowRequestViewer,
} from "../workflow-requests/workflow-request.access";
import { viewerCanDeleteAttachment } from "./attachment.access";
import { recordAttachmentAuditEvent, ATTACHMENT_AUDIT_ACTIONS } from "./attachment.audit";
import { toAttachmentResponse, type AttachmentResponse } from "./attachment.mapper";
import {
  createAttachmentRecord,
  deleteAttachmentRecord,
  findAttachmentForDownload,
  findWorkflowRequestAttachments,
  findWorkflowRequestForAttachmentAccess,
} from "./attachment.repository";
import {
  buildAttachmentStorageKey,
  buildAttachmentStoredFileName,
} from "./attachment.storage-key";
import { validateAttachmentUpload } from "./attachment.validation";

export interface UploadWorkflowRequestAttachmentInput {
  originalFileName: string;
  buffer: Buffer | null | undefined;
  mimeType: string;
}

export interface AttachmentDownloadResult {
  stream: Readable;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
}

type AttachmentAccessAction = "upload" | "list" | "download" | "delete";

async function assertViewerCanAccessAttachments(
  viewer: WorkflowRequestViewer,
  request: {
    requesterId: string;
    currentStep: { approverRoleId: string } | null;
  },
  action: AttachmentAccessAction,
): Promise<void> {
  const canAccess = await viewerCanAccessWorkflowRequest(viewer, {
    requesterId: request.requesterId,
    currentStepApproverRoleId: request.currentStep?.approverRoleId ?? null,
  });

  if (!canAccess) {
    const messageByAction: Record<AttachmentAccessAction, string> = {
      upload:
        "You do not have permission to upload attachments to this workflow request",
      list: "You do not have permission to access attachments on this workflow request",
      download: "You do not have permission to download this attachment",
      delete: "You do not have permission to delete this attachment",
    };

    throw new AuthorizationError(messageByAction[action]);
  }
}

export async function listWorkflowRequestAttachments(
  organisationId: string,
  viewer: WorkflowRequestViewer,
  workflowRequestId: string,
): Promise<AttachmentResponse[]> {
  const request = await findWorkflowRequestForAttachmentAccess(
    workflowRequestId,
    organisationId,
  );

  if (!request) {
    throw new NotFoundError("Workflow request not found");
  }

  await assertViewerCanAccessAttachments(viewer, request, "list");

  const attachments = await findWorkflowRequestAttachments(
    workflowRequestId,
    organisationId,
  );

  return attachments.map(toAttachmentResponse);
}

export async function downloadAttachment(
  organisationId: string,
  viewer: WorkflowRequestViewer,
  attachmentId: string,
): Promise<AttachmentDownloadResult> {
  const attachment = await findAttachmentForDownload(attachmentId, organisationId);

  if (!attachment) {
    throw new NotFoundError("Attachment not found");
  }

  await assertViewerCanAccessAttachments(
    viewer,
    attachment.workflowRequest,
    "download",
  );

  let stream: Readable;

  try {
    stream = await downloadFile(attachment.storageKey);
  } catch (error) {
    if (error instanceof StorageObjectNotFoundError) {
      throw new NotFoundError("Attachment not found");
    }

    throw error;
  }

  recordAttachmentAuditEvent({
    action: ATTACHMENT_AUDIT_ACTIONS.DOWNLOADED,
    organisationId,
    actorUserId: viewer.userId,
    attachmentId: attachment.id,
    workflowRequestId: attachment.workflowRequestId,
    metadata: {
      originalFileName: attachment.originalFileName,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
    },
  });

  logger.info(
    {
      origin: "api",
      event: "attachment.downloaded",
      organisationId,
      workflowRequestId: attachment.workflowRequestId,
      attachmentId: attachment.id,
      downloadedById: viewer.userId,
      fileSize: attachment.fileSize,
    },
    `[API] Attachment "${attachment.originalFileName}" downloaded from workflow request "${attachment.workflowRequestId}"`,
  );

  return {
    stream,
    originalFileName: attachment.originalFileName,
    mimeType: attachment.mimeType,
    fileSize: attachment.fileSize,
  };
}

export async function deleteAttachment(
  organisationId: string,
  viewer: WorkflowRequestViewer,
  attachmentId: string,
): Promise<void> {
  const attachment = await findAttachmentForDownload(attachmentId, organisationId);

  if (!attachment) {
    throw new NotFoundError("Attachment not found");
  }

  await assertViewerCanAccessAttachments(
    viewer,
    attachment.workflowRequest,
    "delete",
  );

  const canDelete = await viewerCanDeleteAttachment(viewer, {
    uploadedById: attachment.uploadedById,
  });

  if (!canDelete) {
    throw new AuthorizationError(
      "You do not have permission to delete this attachment",
    );
  }

  try {
    await deleteFile(attachment.storageKey);
  } catch (error) {
    if (error instanceof StorageObjectNotFoundError) {
      logger.warn(
        {
          origin: "api",
          event: "attachment.delete_missing_object",
          organisationId,
          workflowRequestId: attachment.workflowRequestId,
          attachmentId: attachment.id,
          storageKey: attachment.storageKey,
        },
        `[API] Attachment object was already missing from storage during delete`,
      );
    } else {
      throw error;
    }
  }

  await deleteAttachmentRecord(attachment.id, organisationId);

  recordAttachmentAuditEvent({
    action: ATTACHMENT_AUDIT_ACTIONS.DELETED,
    organisationId,
    actorUserId: viewer.userId,
    attachmentId: attachment.id,
    workflowRequestId: attachment.workflowRequestId,
    metadata: {
      originalFileName: attachment.originalFileName,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
    },
  });

  logger.info(
    {
      origin: "api",
      event: "attachment.deleted",
      organisationId,
      workflowRequestId: attachment.workflowRequestId,
      attachmentId: attachment.id,
      deletedById: viewer.userId,
    },
    `[API] Attachment "${attachment.originalFileName}" deleted from workflow request "${attachment.workflowRequestId}"`,
  );
}

export async function uploadWorkflowRequestAttachment(
  organisationId: string,
  viewer: WorkflowRequestViewer,
  workflowRequestId: string,
  input: UploadWorkflowRequestAttachmentInput,
): Promise<AttachmentResponse> {
  const request = await findWorkflowRequestForAttachmentAccess(
    workflowRequestId,
    organisationId,
  );

  if (!request) {
    throw new NotFoundError("Workflow request not found");
  }

  await assertViewerCanAccessAttachments(viewer, request, "upload");

  const validated = validateAttachmentUpload({
    originalFileName: input.originalFileName,
    buffer: input.buffer,
    mimeType: input.mimeType,
  });

  const attachmentId = randomUUID();
  const storedFileName = buildAttachmentStoredFileName(
    attachmentId,
    validated.originalFileName,
  );
  const storageKey = buildAttachmentStorageKey({
    organisationId,
    workflowRequestId,
    storedFileName,
  });

  let uploadedToStorage = false;

  try {
    await uploadFile({
      buffer: validated.buffer,
      storageKey,
      mimeType: validated.mimeType,
    });
    uploadedToStorage = true;

    const attachment = await createAttachmentRecord({
      id: attachmentId,
      organisationId,
      workflowRequestId,
      uploadedById: viewer.userId,
      originalFileName: validated.originalFileName,
      storedFileName,
      storageKey,
      bucketName: env.storageBucket,
      mimeType: validated.mimeType,
      fileSize: validated.fileSize,
      fileExtension: validated.fileExtension,
    });

    recordAttachmentAuditEvent({
      action: ATTACHMENT_AUDIT_ACTIONS.UPLOADED,
      organisationId,
      actorUserId: viewer.userId,
      attachmentId: attachment.id,
      workflowRequestId,
      metadata: {
        originalFileName: attachment.originalFileName,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
      },
    });

    logger.info(
      {
        origin: "api",
        event: "attachment.uploaded",
        organisationId,
        workflowRequestId,
        attachmentId: attachment.id,
        uploadedById: viewer.userId,
        fileSize: attachment.fileSize,
      },
      `[API] Attachment "${attachment.originalFileName}" uploaded to workflow request "${workflowRequestId}"`,
    );

    return toAttachmentResponse(attachment);
  } catch (error) {
    if (uploadedToStorage) {
      try {
        await deleteFile(storageKey);
      } catch (cleanupError) {
        logger.warn(
          {
            origin: "api",
            event: "attachment.upload_cleanup_failed",
            organisationId,
            workflowRequestId,
            attachmentId,
            storageKey,
            error: cleanupError,
          },
          `[API] Failed to clean up attachment object after metadata write failure`,
        );
      }
    }

    throw error;
  }
}
