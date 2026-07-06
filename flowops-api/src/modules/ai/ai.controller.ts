import type { Request, Response } from "express";

import {
  AuthenticationError,
  AuthorizationError,
} from "../../common/errors/httpErrors";
import { sendSuccess } from "../../common/http/apiResponse";
import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as aiService from "./ai.service";
import type { GenerateWorkflowSuggestionBody } from "./ai.validation";

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

export const generateWorkflowSuggestionController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const organisation = requireOrganisation(req);
    const body = req.body as GenerateWorkflowSuggestionBody;

    const data = await aiService.generateWorkflowSuggestion(
      organisation.id,
      localUser.id,
      body,
    );

    sendSuccess(res, {
      data,
      message: "Workflow suggestion generated successfully",
    });
  },
);
