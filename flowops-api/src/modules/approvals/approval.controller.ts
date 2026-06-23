import type { Request, Response } from "express";

import {
  AuthenticationError,
  AuthorizationError,
} from "../../common/errors/httpErrors";
import { sendSuccess } from "../../common/http/apiResponse";
import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as approvalService from "./approval.service";
import type {
  ApproveWorkflowRequestBody,
  ListPendingApprovalsQuery,
  RejectWorkflowRequestBody,
  RequestChangesWorkflowRequestBody,
} from "./approval.validation";

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

export const approveWorkflowRequestController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const organisation = requireOrganisation(req);
    const membership = requireMembership(req);

    const data = await approvalService.approveWorkflowRequest(
      organisation.id,
      {
        userId: localUser.id,
        roleId: membership.roleId,
        roleName: membership.role.name,
      },
      req.params.id,
      req.body as ApproveWorkflowRequestBody,
    );

    sendSuccess(res, {
      data,
      message: "Workflow request approved successfully",
    });
  },
);

export const rejectWorkflowRequestController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const organisation = requireOrganisation(req);
    const membership = requireMembership(req);

    const data = await approvalService.rejectWorkflowRequest(
      organisation.id,
      {
        userId: localUser.id,
        roleId: membership.roleId,
        roleName: membership.role.name,
      },
      req.params.id,
      req.body as RejectWorkflowRequestBody,
    );

    sendSuccess(res, {
      data,
      message: "Workflow request rejected successfully",
    });
  },
);

export const requestChangesWorkflowRequestController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const localUser = requireLocalUser(req);
    const organisation = requireOrganisation(req);
    const membership = requireMembership(req);

    const data = await approvalService.requestChangesWorkflowRequest(
      organisation.id,
      {
        userId: localUser.id,
        roleId: membership.roleId,
        roleName: membership.role.name,
      },
      req.params.id,
      req.body as RequestChangesWorkflowRequestBody,
    );

    sendSuccess(res, {
      data,
      message: "Changes requested successfully",
    });
  },
);
