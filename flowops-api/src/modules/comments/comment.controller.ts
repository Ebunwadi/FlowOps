import type { Request, Response } from "express";

import {
  AuthenticationError,
  AuthorizationError,
} from "../../common/errors/httpErrors";
import { sendSuccess } from "../../common/http/apiResponse";
import { asyncHandler } from "../../common/middleware/asyncHandler";
import type { CreateWorkflowRequestCommentBody } from "../approvals/approval.validation";
import * as commentService from "./comment.service";

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

export const listWorkflowRequestCommentsController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const organisation = requireOrganisation(req);
    const membership = requireMembership(req);

    const data = await commentService.listWorkflowRequestComments(
      organisation.id,
      {
        userId: localUser.id,
        roleId: membership.roleId,
      },
      req.params.id,
    );

    sendSuccess(res, {
      data,
      message: "Workflow request comments retrieved successfully",
    });
  },
);

export const createWorkflowRequestCommentController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const organisation = requireOrganisation(req);
    const membership = requireMembership(req);

    const data = await commentService.createWorkflowRequestCommentRecord(
      organisation.id,
      {
        userId: localUser.id,
        roleId: membership.roleId,
      },
      req.params.id,
      req.body as CreateWorkflowRequestCommentBody,
    );

    sendSuccess(res, {
      data,
      message: "Comment added successfully",
      statusCode: 201,
    });
  },
);
