import type { Request, Response } from "express";

import {
  AuthenticationError,
  AuthorizationError,
} from "../../common/errors/httpErrors";
import { asyncHandler } from "../../common/middleware/asyncHandler";
import { sendSuccess } from "../../common/http/apiResponse";
import * as workflowTemplateService from "./workflow-template.service";

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

export const createWorkflowTemplateController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const organisation = requireOrganisation(req);
    const data = await workflowTemplateService.createWorkflowTemplate(
      organisation.id,
      localUser.id,
      req.body,
    );

    sendSuccess(res, {
      data,
      message: "Workflow template created successfully",
      statusCode: 201,
    });
  },
);
