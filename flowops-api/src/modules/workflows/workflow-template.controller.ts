import type { Request, Response } from "express";

import {
  AuthenticationError,
  AuthorizationError,
} from "../../common/errors/httpErrors";
import { asyncHandler } from "../../common/middleware/asyncHandler";
import { sendSuccess } from "../../common/http/apiResponse";
import * as workflowTemplateService from "./workflow-template.service";
import type { ListWorkflowTemplatesQuery } from "./workflow-template.validation";

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

export const listWorkflowTemplatesController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const organisation = requireOrganisation(req);
    const query = req.query as unknown as ListWorkflowTemplatesQuery;
    const data = await workflowTemplateService.listWorkflowTemplates(
      organisation.id,
      query,
    );

    sendSuccess(res, {
      data,
      message: "Workflow templates retrieved successfully",
    });
  },
);

export const getWorkflowTemplateByIdController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const organisation = requireOrganisation(req);
    const data = await workflowTemplateService.getWorkflowTemplateById(
      organisation.id,
      req.params.id,
    );

    sendSuccess(res, {
      data,
      message: "Workflow template retrieved successfully",
    });
  },
);

export const updateWorkflowTemplateController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const organisation = requireOrganisation(req);
    const data = await workflowTemplateService.updateWorkflowTemplate(
      organisation.id,
      req.params.id,
      req.body,
    );

    sendSuccess(res, {
      data,
      message: "Workflow template updated successfully",
    });
  },
);
