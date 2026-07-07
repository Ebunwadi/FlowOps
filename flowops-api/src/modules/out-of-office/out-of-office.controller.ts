import type { Request, Response } from "express";

import {
  AuthenticationError,
  AuthorizationError,
} from "../../common/errors/httpErrors";
import { sendSuccess } from "../../common/http/apiResponse";
import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as outOfOfficeService from "./out-of-office.service";
import type {
  CreateOutOfOfficeRuleBody,
  OutOfOfficeRuleParams,
  UpdateOutOfOfficeRuleBody,
} from "./out-of-office.validation";

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

export const listOutOfOfficeRulesController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = requireLocalUser(req);
    const organisation = requireOrganisation(req);

    const data = await outOfOfficeService.listOutOfOfficeRules(
      organisation.id,
      user.id,
    );

    sendSuccess(res, {
      data,
      message: "Out-of-office rules retrieved successfully",
    });
  },
);

export const createOutOfOfficeRuleController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = requireLocalUser(req);
    const organisation = requireOrganisation(req);
    const body = req.body as CreateOutOfOfficeRuleBody;

    const data = await outOfOfficeService.createOutOfOfficeRule(
      organisation.id,
      user.id,
      body,
    );

    sendSuccess(res, {
      data,
      message: "Out-of-office rule created successfully",
      statusCode: 201,
    });
  },
);

export const updateOutOfOfficeRuleController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = requireLocalUser(req);
    const organisation = requireOrganisation(req);
    const { id } = req.params as OutOfOfficeRuleParams;
    const body = req.body as UpdateOutOfOfficeRuleBody;

    const data = await outOfOfficeService.updateOutOfOfficeRule(
      organisation.id,
      user.id,
      id,
      body,
    );

    sendSuccess(res, {
      data,
      message: "Out-of-office rule updated successfully",
    });
  },
);
