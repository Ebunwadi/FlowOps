import type { Request, Response } from "express";

import {
  AuthenticationError,
  AuthorizationError,
} from "../../common/errors/httpErrors";
import { sendSuccess } from "../../common/http/apiResponse";
import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as apiKeyService from "./api-key.service";
import type { CreateApiKeyBody } from "./api-key.validation";

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

export const createApiKeyController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const organisation = requireOrganisation(req);
    const body = req.body as CreateApiKeyBody;

    const data = await apiKeyService.createApiKey(
      organisation.id,
      localUser.id,
      body,
    );

    sendSuccess(res, {
      data,
      message: "API key created successfully",
      statusCode: 201,
    });
  },
);

export const listApiKeysController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    requireLocalUser(req);
    const organisation = requireOrganisation(req);

    const data = await apiKeyService.listApiKeys(organisation.id);

    sendSuccess(res, {
      data,
      message: "API keys retrieved successfully",
    });
  },
);

export const revokeApiKeyController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const organisation = requireOrganisation(req);

    const data = await apiKeyService.revokeApiKey(
      organisation.id,
      localUser.id,
      req.params.id,
    );

    sendSuccess(res, {
      data,
      message: "API key revoked successfully",
    });
  },
);
