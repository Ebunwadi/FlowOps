import type { Request, Response } from "express";

import { AuthenticationError } from "../../common/errors/httpErrors";
import { asyncHandler } from "../../common/middleware/asyncHandler";
import { sendSuccess } from "../../common/http/apiResponse";
import * as memberService from "./member.service";

function requireLocalUser(req: Request) {
  if (!req.localUser) {
    throw new AuthenticationError();
  }

  return req.localUser;
}

export const listOrganisationMembersController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const data = await memberService.listOrganisationMembers(req.params.id);

    sendSuccess(res, {
      data,
      message: "Organisation members retrieved successfully",
    });
  },
);

export const listOrganisationRolesController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const data = await memberService.listOrganisationRoles(req.params.id);

    sendSuccess(res, {
      data,
      message: "Organisation roles retrieved successfully",
    });
  },
);

export const updateOrganisationMemberRoleController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const data = await memberService.updateOrganisationMemberRole(
      req.params.id,
      req.params.memberId,
      localUser.id,
      req.body,
    );

    sendSuccess(res, {
      data,
      message: "Member role updated successfully",
    });
  },
);

export const removeOrganisationMemberController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    await memberService.removeOrganisationMember(
      req.params.id,
      req.params.memberId,
      localUser.id,
    );

    sendSuccess(res, {
      data: null,
      message: "Member removed successfully",
    });
  },
);
