import type { Request, Response } from "express";

import { AuthenticationError } from "../../common/errors/httpErrors";
import { asyncHandler } from "../../common/middleware/asyncHandler";
import { sendSuccess } from "../../common/http/apiResponse";
import * as organisationService from "./organisation.service";

function requireLocalUser(req: Request) {
  if (!req.localUser) {
    throw new AuthenticationError();
  }

  return req.localUser;
}

export const createOrganisationController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const data = await organisationService.createOrganisationForUser(
      localUser.id,
      req.body,
    );

    sendSuccess(res, {
      data,
      message: "Organisation created successfully",
      statusCode: 201,
    });
  },
);

export const getCurrentOrganisationController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const data = await organisationService.getCurrentOrganisationForUser(
      localUser.id,
    );

    sendSuccess(res, {
      data,
      message: "Current organisation retrieved successfully",
    });
  },
);

export const listOrganisationsController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const data = await organisationService.listOrganisationsForUser(localUser.id);

    sendSuccess(res, {
      data,
      message: "Organisations retrieved successfully",
    });
  },
);

export const getOrganisationByIdController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const data = await organisationService.getOrganisationByIdForUser(
      req.params.id,
      localUser.id,
    );

    sendSuccess(res, {
      data,
      message: "Organisation retrieved successfully",
    });
  },
);

export const updateOrganisationController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const data = await organisationService.updateOrganisationForUser(
      req.params.id,
      localUser.id,
      req.body,
    );

    sendSuccess(res, {
      data,
      message: "Organisation updated successfully",
    });
  },
);
