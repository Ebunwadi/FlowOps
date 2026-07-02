import type { Request, Response } from "express";

import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
} from "../../common/errors/httpErrors";
import { sendSuccess } from "../../common/http/apiResponse";
import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as attachmentService from "./attachment.service";

function buildContentDisposition(fileName: string): string {
  const sanitized = fileName.replace(/[\r\n"]/g, "_");

  return `attachment; filename="${sanitized}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function requireLocalUser(req: Request) {
  if (!req.localUser) {
    throw new AuthenticationError();
  }

  return req.localUser;
}

function requireOrganisation(req: Request) {
  if (!req.organisation) {
    throw new AuthorizationError("Organisation context is required");
  }

  return req.organisation;
}

function requireMembership(req: Request) {
  if (!req.membership) {
    throw new AuthorizationError("Organisation context is required");
  }

  return req.membership;
}

export const listWorkflowRequestAttachmentsController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const organisation = requireOrganisation(req);
    const membership = requireMembership(req);

    const data = await attachmentService.listWorkflowRequestAttachments(
      organisation.id,
      {
        userId: localUser.id,
        roleId: membership.roleId,
      },
      req.params.id,
    );

    sendSuccess(res, {
      data,
      message: "Workflow request attachments retrieved successfully",
    });
  },
);

export const downloadAttachmentController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const organisation = requireOrganisation(req);
    const membership = requireMembership(req);

    const download = await attachmentService.downloadAttachment(
      organisation.id,
      {
        userId: localUser.id,
        roleId: membership.roleId,
      },
      req.params.id,
    );

    res.setHeader("Content-Type", download.mimeType);
    res.setHeader("Content-Length", String(download.fileSize));
    res.setHeader(
      "Content-Disposition",
      buildContentDisposition(download.originalFileName),
    );

    download.stream.on("error", () => {
      if (!res.headersSent) {
        res.status(500).end();
        return;
      }

      res.destroy();
    });

    download.stream.pipe(res);
  },
);

export const deleteAttachmentController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const organisation = requireOrganisation(req);
    const membership = requireMembership(req);

    await attachmentService.deleteAttachment(
      organisation.id,
      {
        userId: localUser.id,
        roleId: membership.roleId,
      },
      req.params.id,
    );

    sendSuccess(res, {
      data: null,
      message: "Attachment deleted successfully",
    });
  },
);

export const uploadWorkflowRequestAttachmentController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const organisation = requireOrganisation(req);
    const membership = requireMembership(req);
    const uploadedFile = req.file;

    if (!uploadedFile) {
      throw new ValidationError("Attachment upload is invalid", [
        {
          field: "file",
          message: "A file is required",
        },
      ]);
    }

    const data = await attachmentService.uploadWorkflowRequestAttachment(
      organisation.id,
      {
        userId: localUser.id,
        roleId: membership.roleId,
      },
      req.params.id,
      {
        originalFileName: uploadedFile.originalname,
        buffer: uploadedFile.buffer,
        mimeType: uploadedFile.mimetype,
      },
    );

    sendSuccess(res, {
      data,
      message: "Attachment uploaded successfully",
      statusCode: 201,
    });
  },
);
