import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "../src/common/errors/httpErrors";
import { Readable } from "node:stream";
import * as auditLogService from "../src/modules/audit-log/audit-log.service";
import { ATTACHMENT_AUDIT_ACTIONS } from "../src/modules/attachments/attachment.audit";
import * as attachmentRepository from "../src/modules/attachments/attachment.repository";
import { uploadWorkflowRequestAttachment, listWorkflowRequestAttachments, downloadAttachment, deleteAttachment } from "../src/modules/attachments/attachment.service";
import * as roleRepository from "../src/modules/roles/role.repository";
import * as storageService from "../src/modules/storage/storage.service";
import { StorageObjectNotFoundError } from "../src/modules/storage/storage.errors";

jest.mock("node:crypto", () => ({
  randomUUID: jest.fn(() => "bbbb8888-8888-4888-8888-888888888888"),
}));

jest.mock("../src/modules/attachments/attachment.repository");
jest.mock("../src/modules/roles/role.repository");
jest.mock("../src/modules/storage/storage.service");
jest.mock("../src/modules/audit-log/audit-log.service");

describe("attachment service", () => {
  const organisationId = "550e8400-e29b-41d4-a716-446655440000";
  const requesterId = "770e8400-e29b-41d4-a716-446655440002";
  const uploaderUserId = "660e8400-e29b-41d4-a716-446655440001";
  const otherUserId = "880e8400-e29b-41d4-a716-446655440003";
  const requestId = "aaaa9999-9999-4999-8999-999999999999";
  const approverRoleId = "44444444-4444-4444-8444-444444444444";
  const staffRoleId = "55555555-5555-4555-8555-555555555555";
  const attachmentId = "bbbb8888-8888-4888-8888-888888888888";

  const requestAccessRecord = {
    id: requestId,
    requesterId,
    currentStep: {
      approverRoleId,
    },
  };

  const attachmentRecord = {
    id: attachmentId,
    organisationId,
    workflowRequestId: requestId,
    originalFileName: "report.pdf",
    storedFileName: `${attachmentId}-report.pdf`,
    storageKey: `organisations/${organisationId}/requests/${requestId}/attachments/${attachmentId}-report.pdf`,
    bucketName: "flowops-attachments",
    mimeType: "application/pdf",
    fileSize: 16,
    fileExtension: "pdf",
    createdAt: new Date("2026-07-02T12:00:00.000Z"),
    updatedAt: new Date("2026-07-02T12:00:00.000Z"),
    uploadedBy: {
      id: uploaderUserId,
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@example.com",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(attachmentRepository.findWorkflowRequestForAttachmentAccess)
      .mockResolvedValue(requestAccessRecord);
    jest.mocked(roleRepository.findPermissionKeysByRoleId).mockResolvedValue([]);
    jest.mocked(storageService.uploadFile).mockResolvedValue(undefined);
    jest
      .mocked(attachmentRepository.createAttachmentRecord)
      .mockResolvedValue(attachmentRecord);
  });

  describe("uploadWorkflowRequestAttachment", () => {
  it("uploads an attachment for the requester", async () => {
    const buffer = Buffer.from("sample pdf content");

    const result = await uploadWorkflowRequestAttachment(
      organisationId,
      { userId: requesterId, roleId: staffRoleId },
      requestId,
      {
        originalFileName: "report.pdf",
        buffer,
        mimeType: "application/pdf",
      },
    );

    expect(storageService.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        buffer,
        mimeType: "application/pdf",
        storageKey: expect.stringContaining(
          `/requests/${requestId}/attachments/`,
        ),
      }),
    );
    expect(attachmentRepository.createAttachmentRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        organisationId,
        workflowRequestId: requestId,
        uploadedById: requesterId,
        originalFileName: "report.pdf",
        mimeType: "application/pdf",
        fileSize: buffer.byteLength,
      }),
    );
    expect(auditLogService.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: ATTACHMENT_AUDIT_ACTIONS.UPLOADED,
        organisationId,
        actorUserId: requesterId,
        entityId: attachmentId,
      }),
    );
    expect(result).toEqual({
      id: attachmentId,
      workflowRequestId: requestId,
      originalFileName: "report.pdf",
      mimeType: "application/pdf",
      fileSize: 16,
      fileExtension: "pdf",
      uploadedBy: attachmentRecord.uploadedBy,
      createdAt: attachmentRecord.createdAt.toISOString(),
      updatedAt: attachmentRecord.updatedAt.toISOString(),
    });
  });

  it("allows the current approver role to upload attachments", async () => {
    await uploadWorkflowRequestAttachment(
      organisationId,
      { userId: otherUserId, roleId: approverRoleId },
      requestId,
      {
        originalFileName: "evidence.pdf",
        buffer: Buffer.from("evidence"),
        mimeType: "application/pdf",
      },
    );

    expect(attachmentRepository.createAttachmentRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        uploadedById: otherUserId,
      }),
    );
  });

  it("allows users with requests:view-all to upload attachments", async () => {
    jest
      .mocked(roleRepository.findPermissionKeysByRoleId)
      .mockResolvedValue(["requests:view-all"]);

    await uploadWorkflowRequestAttachment(
      organisationId,
      { userId: otherUserId, roleId: staffRoleId },
      requestId,
      {
        originalFileName: "notes.txt",
        buffer: Buffer.from("notes"),
        mimeType: "text/plain",
      },
    );

    expect(attachmentRepository.createAttachmentRecord).toHaveBeenCalled();
  });

  it("throws when the workflow request does not exist", async () => {
    jest
      .mocked(attachmentRepository.findWorkflowRequestForAttachmentAccess)
      .mockResolvedValue(null);

    await expect(
      uploadWorkflowRequestAttachment(
        organisationId,
        { userId: requesterId, roleId: staffRoleId },
        requestId,
        {
          originalFileName: "report.pdf",
          buffer: Buffer.from("sample"),
          mimeType: "application/pdf",
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it("throws when the user cannot access the workflow request", async () => {
    await expect(
      uploadWorkflowRequestAttachment(
        organisationId,
        { userId: otherUserId, roleId: staffRoleId },
        requestId,
        {
          originalFileName: "report.pdf",
          buffer: Buffer.from("sample"),
          mimeType: "application/pdf",
        },
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);

    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it("rejects invalid file uploads before storage writes", async () => {
    await expect(
      uploadWorkflowRequestAttachment(
        organisationId,
        { userId: requesterId, roleId: staffRoleId },
        requestId,
        {
          originalFileName: "report.pdf",
          buffer: null,
          mimeType: "application/pdf",
        },
      ),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it("cleans up object storage when metadata persistence fails", async () => {
    jest
      .mocked(attachmentRepository.createAttachmentRecord)
      .mockRejectedValue(new Error("database unavailable"));

    await expect(
      uploadWorkflowRequestAttachment(
        organisationId,
        { userId: requesterId, roleId: staffRoleId },
        requestId,
        {
          originalFileName: "report.pdf",
          buffer: Buffer.from("sample"),
          mimeType: "application/pdf",
        },
      ),
    ).rejects.toThrow("database unavailable");

    expect(storageService.uploadFile).toHaveBeenCalled();
    expect(storageService.deleteFile).toHaveBeenCalledWith(
      expect.stringContaining(`/requests/${requestId}/attachments/`),
    );
  });
  });

  describe("listWorkflowRequestAttachments", () => {
    it("returns attachments for the requester", async () => {
      jest
        .mocked(attachmentRepository.findWorkflowRequestAttachments)
        .mockResolvedValue([attachmentRecord]);

      const result = await listWorkflowRequestAttachments(
        organisationId,
        { userId: requesterId, roleId: staffRoleId },
        requestId,
      );

      expect(attachmentRepository.findWorkflowRequestAttachments).toHaveBeenCalledWith(
        requestId,
        organisationId,
      );
      expect(result).toEqual([
        {
          id: attachmentId,
          workflowRequestId: requestId,
          originalFileName: "report.pdf",
          mimeType: "application/pdf",
          fileSize: 16,
          fileExtension: "pdf",
          uploadedBy: attachmentRecord.uploadedBy,
          createdAt: attachmentRecord.createdAt.toISOString(),
          updatedAt: attachmentRecord.updatedAt.toISOString(),
        },
      ]);
    });

    it("allows the current approver role to list attachments", async () => {
      jest
        .mocked(attachmentRepository.findWorkflowRequestAttachments)
        .mockResolvedValue([]);

      await listWorkflowRequestAttachments(
        organisationId,
        { userId: otherUserId, roleId: approverRoleId },
        requestId,
      );

      expect(attachmentRepository.findWorkflowRequestAttachments).toHaveBeenCalledWith(
        requestId,
        organisationId,
      );
    });

    it("allows users with requests:view-all to list attachments", async () => {
      jest
        .mocked(roleRepository.findPermissionKeysByRoleId)
        .mockResolvedValue(["requests:view-all"]);
      jest
        .mocked(attachmentRepository.findWorkflowRequestAttachments)
        .mockResolvedValue([]);

      await listWorkflowRequestAttachments(
        organisationId,
        { userId: otherUserId, roleId: staffRoleId },
        requestId,
      );

      expect(attachmentRepository.findWorkflowRequestAttachments).toHaveBeenCalled();
    });

    it("throws when the workflow request does not exist", async () => {
      jest
        .mocked(attachmentRepository.findWorkflowRequestForAttachmentAccess)
        .mockResolvedValue(null);

      await expect(
        listWorkflowRequestAttachments(
          organisationId,
          { userId: requesterId, roleId: staffRoleId },
          requestId,
        ),
      ).rejects.toBeInstanceOf(NotFoundError);

      expect(attachmentRepository.findWorkflowRequestAttachments).not.toHaveBeenCalled();
    });

    it("throws when the user cannot access the workflow request", async () => {
      await expect(
        listWorkflowRequestAttachments(
          organisationId,
          { userId: otherUserId, roleId: staffRoleId },
          requestId,
        ),
      ).rejects.toBeInstanceOf(AuthorizationError);

      expect(attachmentRepository.findWorkflowRequestAttachments).not.toHaveBeenCalled();
    });
  });

  describe("downloadAttachment", () => {
    const attachmentForDownloadRecord = {
      id: attachmentId,
      organisationId,
      workflowRequestId: requestId,
      originalFileName: "report.pdf",
      storageKey: `organisations/${organisationId}/requests/${requestId}/attachments/${attachmentId}-report.pdf`,
      mimeType: "application/pdf",
      fileSize: 16,
      uploadedById: uploaderUserId,
      workflowRequest: requestAccessRecord,
    };

    beforeEach(() => {
      jest
        .mocked(attachmentRepository.findAttachmentForDownload)
        .mockResolvedValue(attachmentForDownloadRecord);
      jest
        .mocked(storageService.downloadFile)
        .mockResolvedValue(Readable.from(["sample pdf content"]));
    });

    it("returns a file stream for an authorised user", async () => {
      const result = await downloadAttachment(
        organisationId,
        { userId: requesterId, roleId: staffRoleId },
        attachmentId,
      );

      expect(attachmentRepository.findAttachmentForDownload).toHaveBeenCalledWith(
        attachmentId,
        organisationId,
      );
      expect(storageService.downloadFile).toHaveBeenCalledWith(
        attachmentForDownloadRecord.storageKey,
      );
      expect(auditLogService.recordAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: ATTACHMENT_AUDIT_ACTIONS.DOWNLOADED,
          organisationId,
          actorUserId: requesterId,
          entityId: attachmentId,
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          originalFileName: "report.pdf",
          mimeType: "application/pdf",
          fileSize: 16,
          stream: expect.any(Readable),
        }),
      );
    });

    it("allows the current approver role to download attachments", async () => {
      await downloadAttachment(
        organisationId,
        { userId: otherUserId, roleId: approverRoleId },
        attachmentId,
      );

      expect(storageService.downloadFile).toHaveBeenCalled();
    });

    it("throws when the attachment does not exist in the organisation", async () => {
      jest.mocked(attachmentRepository.findAttachmentForDownload).mockResolvedValue(null);

      await expect(
        downloadAttachment(
          organisationId,
          { userId: requesterId, roleId: staffRoleId },
          attachmentId,
        ),
      ).rejects.toBeInstanceOf(NotFoundError);

      expect(storageService.downloadFile).not.toHaveBeenCalled();
    });

    it("throws when the user cannot access the workflow request", async () => {
      await expect(
        downloadAttachment(
          organisationId,
          { userId: otherUserId, roleId: staffRoleId },
          attachmentId,
        ),
      ).rejects.toBeInstanceOf(AuthorizationError);

      expect(storageService.downloadFile).not.toHaveBeenCalled();
    });

    it("returns 404 when the object is missing from storage", async () => {
      jest
        .mocked(storageService.downloadFile)
        .mockRejectedValue(new StorageObjectNotFoundError("missing-key"));

      await expect(
        downloadAttachment(
          organisationId,
          { userId: requesterId, roleId: staffRoleId },
          attachmentId,
        ),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("deleteAttachment", () => {
    const attachmentForDownloadRecord = {
      id: attachmentId,
      organisationId,
      workflowRequestId: requestId,
      originalFileName: "report.pdf",
      storageKey: `organisations/${organisationId}/requests/${requestId}/attachments/${attachmentId}-report.pdf`,
      mimeType: "application/pdf",
      fileSize: 16,
      uploadedById: uploaderUserId,
      workflowRequest: requestAccessRecord,
    };

    beforeEach(() => {
      jest
        .mocked(attachmentRepository.findAttachmentForDownload)
        .mockResolvedValue(attachmentForDownloadRecord);
      jest.mocked(storageService.deleteFile).mockResolvedValue(undefined);
      jest
        .mocked(attachmentRepository.deleteAttachmentRecord)
        .mockResolvedValue({ id: attachmentId });
    });

    it("allows the uploader to delete their attachment", async () => {
      jest.mocked(attachmentRepository.findAttachmentForDownload).mockResolvedValue({
        ...attachmentForDownloadRecord,
        uploadedById: requesterId,
      });

      await deleteAttachment(
        organisationId,
        { userId: requesterId, roleId: staffRoleId },
        attachmentId,
      );

      expect(storageService.deleteFile).toHaveBeenCalledWith(
        attachmentForDownloadRecord.storageKey,
      );
      expect(attachmentRepository.deleteAttachmentRecord).toHaveBeenCalledWith(
        attachmentId,
        organisationId,
      );
      expect(auditLogService.recordAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: ATTACHMENT_AUDIT_ACTIONS.DELETED,
          actorUserId: requesterId,
        }),
      );
    });

    it("allows users with requests:view-all to delete attachments", async () => {
      jest
        .mocked(roleRepository.findPermissionKeysByRoleId)
        .mockResolvedValue(["requests:view-all"]);

      await deleteAttachment(
        organisationId,
        { userId: otherUserId, roleId: staffRoleId },
        attachmentId,
      );

      expect(attachmentRepository.deleteAttachmentRecord).toHaveBeenCalled();
    });

    it("throws when the attachment does not exist in the organisation", async () => {
      jest.mocked(attachmentRepository.findAttachmentForDownload).mockResolvedValue(null);

      await expect(
        deleteAttachment(
          organisationId,
          { userId: uploaderUserId, roleId: staffRoleId },
          attachmentId,
        ),
      ).rejects.toBeInstanceOf(NotFoundError);

      expect(storageService.deleteFile).not.toHaveBeenCalled();
    });

    it("throws when the user cannot access the workflow request", async () => {
      await expect(
        deleteAttachment(
          organisationId,
          { userId: otherUserId, roleId: staffRoleId },
          attachmentId,
        ),
      ).rejects.toBeInstanceOf(AuthorizationError);

      expect(storageService.deleteFile).not.toHaveBeenCalled();
    });

    it("throws when the user lacks delete permission", async () => {
      jest.mocked(attachmentRepository.findAttachmentForDownload).mockResolvedValue({
        ...attachmentForDownloadRecord,
        uploadedById: requesterId,
      });

      await expect(
        deleteAttachment(
          organisationId,
          { userId: otherUserId, roleId: approverRoleId },
          attachmentId,
        ),
      ).rejects.toBeInstanceOf(AuthorizationError);

      expect(storageService.deleteFile).not.toHaveBeenCalled();
    });

    it("still deletes metadata when the storage object is already missing", async () => {
      jest.mocked(attachmentRepository.findAttachmentForDownload).mockResolvedValue({
        ...attachmentForDownloadRecord,
        uploadedById: requesterId,
      });
      jest
        .mocked(storageService.deleteFile)
        .mockRejectedValue(new StorageObjectNotFoundError("missing-key"));

      await deleteAttachment(
        organisationId,
        { userId: requesterId, roleId: staffRoleId },
        attachmentId,
      );

      expect(attachmentRepository.deleteAttachmentRecord).toHaveBeenCalledWith(
        attachmentId,
        organisationId,
      );
    });
  });
});
