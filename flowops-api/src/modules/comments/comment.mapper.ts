export interface WorkflowRequestCommentAuthorSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export interface WorkflowRequestCommentResponse {
  id: string;
  content: string;
  author: WorkflowRequestCommentAuthorSummary;
  createdAt: string;
  updatedAt: string;
}

export function toWorkflowRequestCommentResponse(comment: {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: WorkflowRequestCommentAuthorSummary;
}): WorkflowRequestCommentResponse {
  return {
    id: comment.id,
    content: comment.content,
    author: {
      id: comment.author.id,
      firstName: comment.author.firstName,
      lastName: comment.author.lastName,
      email: comment.author.email,
    },
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}
