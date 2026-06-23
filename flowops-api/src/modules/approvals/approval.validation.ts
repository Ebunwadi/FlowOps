import { z } from "zod";

export const APPROVAL_DECISIONS = [
  "APPROVED",
  "REJECTED",
  "CHANGES_REQUESTED",
] as const;

/** Maximum length for approval decision comments and request comments. */
export const APPROVAL_COMMENT_MAX_LENGTH = 2000;

const optionalCommentSchema = z
  .string()
  .trim()
  .max(
    APPROVAL_COMMENT_MAX_LENGTH,
    `Comment must be at most ${APPROVAL_COMMENT_MAX_LENGTH} characters`,
  )
  .optional();

const requiredCommentSchema = z
  .string()
  .trim()
  .min(1, "Comment is required")
  .max(
    APPROVAL_COMMENT_MAX_LENGTH,
    `Comment must be at most ${APPROVAL_COMMENT_MAX_LENGTH} characters`,
  );

/** Body for approving the current step of a workflow request. Comment is optional. */
export const approveWorkflowRequestSchema = z.object({
  comment: optionalCommentSchema,
});

/** Body for rejecting a workflow request. Comment is required. */
export const rejectWorkflowRequestSchema = z.object({
  comment: requiredCommentSchema,
});

/** Body for requesting changes on a workflow request. Comment is required. */
export const requestChangesWorkflowRequestSchema = z.object({
  comment: requiredCommentSchema,
});

/** Body for adding a comment to a workflow request. */
export const createWorkflowRequestCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Comment content is required")
    .max(
      APPROVAL_COMMENT_MAX_LENGTH,
      `Comment must be at most ${APPROVAL_COMMENT_MAX_LENGTH} characters`,
    ),
});

export const workflowRequestApprovalParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listPendingApprovalsQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ApproveWorkflowRequestBody = z.infer<typeof approveWorkflowRequestSchema>;
export type RejectWorkflowRequestBody = z.infer<typeof rejectWorkflowRequestSchema>;
export type RequestChangesWorkflowRequestBody = z.infer<
  typeof requestChangesWorkflowRequestSchema
>;
export type CreateWorkflowRequestCommentBody = z.infer<
  typeof createWorkflowRequestCommentSchema
>;
export type WorkflowRequestApprovalParams = z.infer<
  typeof workflowRequestApprovalParamsSchema
>;
export type ListPendingApprovalsQuery = z.infer<typeof listPendingApprovalsQuerySchema>;
