import type { Request, Response } from "express";

import {
  AuthenticationError,
  AuthorizationError,
} from "../../common/errors/httpErrors";
import { sendSuccess } from "../../common/http/apiResponse";
import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as reportsExportService from "./reports.export.service";
import * as reportsService from "./reports.service";
import type { ReportsSummaryQuery } from "./reports.validation";

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

export const getReportsSummaryController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    requireLocalUser(req);
    const organisation = requireOrganisation(req);
    const query = req.query as unknown as ReportsSummaryQuery;

    const data = await reportsService.getReportsSummary(organisation.id, query);

    sendSuccess(res, {
      data,
      message: "Reports summary retrieved successfully",
    });
  },
);

export const exportRequestsCsvController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    requireLocalUser(req);
    const organisation = requireOrganisation(req);
    const query = req.query as unknown as ReportsSummaryQuery;

    const exportFile = await reportsExportService.buildRequestsCsvExport(
      organisation.id,
      organisation.name,
      query,
    );

    res.setHeader("Content-Type", exportFile.contentType);
    res.setHeader("Content-Length", String(exportFile.content.byteLength));
    res.setHeader(
      "Content-Disposition",
      buildContentDisposition(exportFile.fileName),
    );
    res.send(exportFile.content);
  },
);

export const exportRequestsPdfController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    requireLocalUser(req);
    const organisation = requireOrganisation(req);
    const query = req.query as unknown as ReportsSummaryQuery;

    const exportFile = await reportsExportService.buildRequestsPdfExport(
      organisation.id,
      organisation.name,
      query,
    );

    res.setHeader("Content-Type", exportFile.contentType);
    res.setHeader("Content-Length", String(exportFile.content.byteLength));
    res.setHeader(
      "Content-Disposition",
      buildContentDisposition(exportFile.fileName),
    );
    res.send(exportFile.content);
  },
);
