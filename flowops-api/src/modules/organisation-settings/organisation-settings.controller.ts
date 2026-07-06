import type { Request, Response } from "express";

import {
  AuthenticationError,
  AuthorizationError,
} from "../../common/errors/httpErrors";
import { sendSuccess } from "../../common/http/apiResponse";
import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as organisationSettingsService from "./organisation-settings.service";
import type { UpdateOrganisationSettingsBody } from "./organisation-settings.validation";

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

export const getOrganisationSettingsController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    requireLocalUser(req);
    const organisation = requireOrganisation(req);

    const data = await organisationSettingsService.getOrganisationSettings(
      organisation.id,
    );

    sendSuccess(res, {
      data,
      message: "Organisation settings retrieved successfully",
    });
  },
);

export const updateOrganisationSettingsController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    requireLocalUser(req);
    const organisation = requireOrganisation(req);
    const body = req.body as UpdateOrganisationSettingsBody;

    const data = await organisationSettingsService.updateOrganisationSettings(
      organisation.id,
      body,
    );

    sendSuccess(res, {
      data,
      message: "Organisation settings updated successfully",
    });
  },
);
