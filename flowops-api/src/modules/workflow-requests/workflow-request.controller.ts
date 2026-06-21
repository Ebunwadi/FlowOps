import type { Request, Response } from "express";

import {
  AuthenticationError,
  AuthorizationError,
} from "../../common/errors/httpErrors";
import { sendSuccess } from "../../common/http/apiResponse";
import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as workflowRequestService from "./workflow-request.service";

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

export const submitWorkflowRequestController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const organisation = requireOrganisation(req);
    const data = await workflowRequestService.submitWorkflowRequest(
      organisation.id,
      localUser.id,
      req.body,
    );

    sendSuccess(res, {
      data,
      message: "Workflow request submitted successfully",
      statusCode: 201,
    });
  },
);

export const saveDraftWorkflowRequestController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const organisation = requireOrganisation(req);
    const data = await workflowRequestService.saveDraftWorkflowRequest(
      organisation.id,
      localUser.id,
      req.body,
    );

    sendSuccess(res, {
      data,
      message: "Workflow request draft saved successfully",
      statusCode: 201,
    });
  },
);

export const updateDraftWorkflowRequestController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const organisation = requireOrganisation(req);
    const data = await workflowRequestService.updateDraftWorkflowRequest(
      organisation.id,
      localUser.id,
      req.params.id,
      req.body,
    );

    sendSuccess(res, {
      data,
      message: "Workflow request draft updated successfully",
    });
  },
);

export const submitDraftWorkflowRequestController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const organisation = requireOrganisation(req);
    const data = await workflowRequestService.submitDraftWorkflowRequest(
      organisation.id,
      localUser.id,
      req.params.id,
    );

    sendSuccess(res, {
      data,
      message: "Workflow request submitted successfully",
    });
  },
);
