import type { DbClient } from "../../common/types/database";
import { prisma } from "../../config/database";

const attachmentSelect = {
  id: true,
  organisationId: true,
  workflowRequestId: true,
  originalFileName: true,
  storedFileName: true,
  storageKey: true,
  bucketName: true,
  mimeType: true,
  fileSize: true,
  fileExtension: true,
  createdAt: true,
  updatedAt: true,
  uploadedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} as const;

const requestForAttachmentAccessSelect = {
  id: true,
  requesterId: true,
  currentStep: {
    select: {
      approverRoleId: true,
    },
  },
} as const;

const attachmentListSelect = {
  id: true,
  workflowRequestId: true,
  originalFileName: true,
  mimeType: true,
  fileSize: true,
  fileExtension: true,
  createdAt: true,
  updatedAt: true,
  uploadedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} as const;

const attachmentForDownloadSelect = {
  id: true,
  organisationId: true,
  workflowRequestId: true,
  originalFileName: true,
  storageKey: true,
  mimeType: true,
  fileSize: true,
  uploadedById: true,
  workflowRequest: {
    select: requestForAttachmentAccessSelect,
  },
} as const;

export async function findWorkflowRequestForAttachmentAccess(
  workflowRequestId: string,
  organisationId: string,
  db: DbClient = prisma,
) {
  return db.workflowRequest.findFirst({
    where: {
      id: workflowRequestId,
      organisationId,
    },
    select: requestForAttachmentAccessSelect,
  });
}

export interface CreateAttachmentRecordInput {
  id: string;
  organisationId: string;
  workflowRequestId: string;
  uploadedById: string;
  originalFileName: string;
  storedFileName: string;
  storageKey: string;
  bucketName: string;
  mimeType: string;
  fileSize: number;
  fileExtension: string | null;
}

export async function createAttachmentRecord(
  input: CreateAttachmentRecordInput,
  db: DbClient = prisma,
) {
  return db.attachment.create({
    data: {
      id: input.id,
      organisationId: input.organisationId,
      workflowRequestId: input.workflowRequestId,
      uploadedById: input.uploadedById,
      originalFileName: input.originalFileName,
      storedFileName: input.storedFileName,
      storageKey: input.storageKey,
      bucketName: input.bucketName,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      fileExtension: input.fileExtension,
    },
    select: attachmentSelect,
  });
}

export async function findWorkflowRequestAttachments(
  workflowRequestId: string,
  organisationId: string,
  db: DbClient = prisma,
) {
  return db.attachment.findMany({
    where: {
      workflowRequestId,
      organisationId,
    },
    orderBy: { createdAt: "asc" },
    select: attachmentListSelect,
  });
}

export async function deleteAttachmentRecord(
  attachmentId: string,
  organisationId: string,
  db: DbClient = prisma,
) {
  return db.attachment.delete({
    where: {
      id: attachmentId,
      organisationId,
    },
    select: {
      id: true,
    },
  });
}

export async function findAttachmentForDownload(
  attachmentId: string,
  organisationId: string,
  db: DbClient = prisma,
) {
  return db.attachment.findFirst({
    where: {
      id: attachmentId,
      organisationId,
    },
    select: attachmentForDownloadSelect,
  });
}
