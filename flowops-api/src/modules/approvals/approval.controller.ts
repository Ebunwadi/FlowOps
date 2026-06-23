import type { Request, Response } from "express";

import {
  AuthenticationError,
  AuthorizationError,
} from "../../common/errors/httpErrors";
import { sendSuccess } from "../../common/http/apiResponse";
import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as approvalService from "./approval.service";
import type { ListPendingApprovalsQuery } from "./approval.validation";

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

export const listPendingApprovalsController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    requireLocalUser(req);
    const organisation = requireOrganisation(req);
    const membership = requireMembership(req);
    const query = req.query as unknown as ListPendingApprovalsQuery;

    const data = await approvalService.listPendingApprovals(
      organisation.id,
      {
        roleId: membership.roleId,
        roleName: membership.role.name,
      },
      query,
    );

    sendSuccess(res, {
      data,
      message: "Pending approvals retrieved successfully",
    });
  },
);
