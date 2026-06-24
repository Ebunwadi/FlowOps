import { AuthorizationError, NotFoundError } from "../src/common/errors/httpErrors";
import * as roleRepository from "../src/modules/roles/role.repository";
import * as commentRepository from "../src/modules/comments/comment.repository";
import {
  createWorkflowRequestCommentRecord,
  listWorkflowRequestComments,
} from "../src/modules/comments/comment.service";

jest.mock("../src/modules/comments/comment.repository");
jest.mock("../src/modules/roles/role.repository");

describe("comment service", () => {
  const organisationId = "550e8400-e29b-41d4-a716-446655440000";
  const requesterId = "770e8400-e29b-41d4-a716-446655440002";
  const authorUserId = "660e8400-e29b-41d4-a716-446655440001";
  const otherUserId = "880e8400-e29b-41d4-a716-446655440003";
  const requestId = "aaaa9999-9999-4999-8999-999999999999";
  const approverRoleId = "44444444-4444-4444-8444-444444444444";
  const staffRoleId = "55555555-5555-4555-8555-555555555555";
  const adminRoleId = "66666666-6666-4666-8666-666666666666";

  const requestAccessRecord = {
    id: requestId,
    requesterId,
    currentStep: {
      approverRoleId,
    },
  };

  const commentRecord = {
    id: "cccc7777-7777-4777-8777-777777777777",
    content: "Please clarify the budget line item.",
    createdAt: new Date("2026-06-20T12:00:00.000Z"),
    updatedAt: new Date("2026-06-20T12:00:00.000Z"),
    author: {
      id: authorUserId,
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@example.com",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(commentRepository.findWorkflowRequestForCommentAccess)
      .mockResolvedValue(requestAccessRecord);
    jest.mocked(roleRepository.findPermissionKeysByRoleId).mockResolvedValue([]);
  });

  describe("listWorkflowRequestComments", () => {
    it("returns comments for the requester", async () => {
      jest
        .mocked(commentRepository.findWorkflowRequestComments)
        .mockResolvedValue([commentRecord]);

      const result = await listWorkflowRequestComments(
        organisationId,
        { userId: requesterId, roleId: staffRoleId },
        requestId,
      );

      expect(result).toEqual([
        {
          id: commentRecord.id,
          content: commentRecord.content,
          author: commentRecord.author,
          createdAt: commentRecord.createdAt.toISOString(),
          updatedAt: commentRecord.updatedAt.toISOString(),
        },
      ]);
    });

    it("allows the current approver role to list comments", async () => {
      jest.mocked(commentRepository.findWorkflowRequestComments).mockResolvedValue([]);

      await listWorkflowRequestComments(
        organisationId,
        { userId: otherUserId, roleId: approverRoleId },
        requestId,
      );

      expect(commentRepository.findWorkflowRequestComments).toHaveBeenCalledWith(requestId);
    });

    it("allows users with requests:view-all to list comments", async () => {
      jest
        .mocked(roleRepository.findPermissionKeysByRoleId)
        .mockResolvedValue(["requests:view-all"]);
      jest.mocked(commentRepository.findWorkflowRequestComments).mockResolvedValue([]);

      await listWorkflowRequestComments(
        organisationId,
        { userId: otherUserId, roleId: adminRoleId },
        requestId,
      );

      expect(commentRepository.findWorkflowRequestComments).toHaveBeenCalled();
    });

    it("rejects unauthorised users with 403", async () => {
      await expect(
        listWorkflowRequestComments(
          organisationId,
          { userId: otherUserId, roleId: staffRoleId },
          requestId,
        ),
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it("returns 404 when the request does not exist", async () => {
      jest
        .mocked(commentRepository.findWorkflowRequestForCommentAccess)
        .mockResolvedValue(null);

      await expect(
        listWorkflowRequestComments(
          organisationId,
          { userId: requesterId, roleId: staffRoleId },
          requestId,
        ),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("createWorkflowRequestCommentRecord", () => {
    it("creates a comment for an authorised user", async () => {
      jest
        .mocked(commentRepository.createWorkflowRequestComment)
        .mockResolvedValue(commentRecord);

      const result = await createWorkflowRequestCommentRecord(
        organisationId,
        { userId: authorUserId, roleId: approverRoleId },
        requestId,
        { content: "Please clarify the budget line item." },
      );

      expect(commentRepository.createWorkflowRequestComment).toHaveBeenCalledWith({
        workflowRequestId: requestId,
        authorId: authorUserId,
        content: "Please clarify the budget line item.",
      });
      expect(result.content).toBe("Please clarify the budget line item.");
    });

    it("rejects unauthorised users with 403", async () => {
      await expect(
        createWorkflowRequestCommentRecord(
          organisationId,
          { userId: otherUserId, roleId: staffRoleId },
          requestId,
          { content: "Not allowed." },
        ),
      ).rejects.toBeInstanceOf(AuthorizationError);
    });
  });
});
