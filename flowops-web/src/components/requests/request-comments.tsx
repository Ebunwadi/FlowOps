import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  createWorkflowRequestComment,
  listWorkflowRequestComments,
} from "@/api/workflow-requests";
import { Button } from "@/components/ui/button";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { Textarea } from "@/components/ui/textarea";
import { formatApiErrorMessage } from "@/lib/api-errors";
import {
  formatRequesterName,
  formatWorkflowRequestDateTime,
  type WorkflowRequestCommentResponse,
} from "@/types/workflow-request";

const MAX_COMMENT_LENGTH = 2000;

export function RequestComments({
  workflowRequestId,
  canComment,
  initialComments,
}: {
  workflowRequestId: string;
  canComment: boolean;
  initialComments?: WorkflowRequestCommentResponse[];
}) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const commentsQuery = useQuery({
    queryKey: ["workflow-request-comments", workflowRequestId],
    queryFn: () => listWorkflowRequestComments(workflowRequestId),
    initialData: initialComments,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createWorkflowRequestComment(workflowRequestId, { content: content.trim() }),
    onSuccess: async () => {
      setContent("");
      setSubmitError(null);
      await queryClient.invalidateQueries({
        queryKey: ["workflow-request-comments", workflowRequestId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["workflow-request", workflowRequestId],
      });
    },
    onError: (error) => {
      setSubmitError(formatApiErrorMessage(error));
    },
  });

  const trimmed = content.trim();
  const comments = commentsQuery.data ?? [];

  const handleSubmit = () => {
    if (trimmed.length === 0) {
      setSubmitError("Comment cannot be empty.");
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-4">
      {commentsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading comments…</p>
      ) : commentsQuery.isError ? (
        <DismissibleAlert
          messageKey={formatApiErrorMessage(commentsQuery.error)}
          variant="error"
        >
          {formatApiErrorMessage(commentsQuery.error)}
        </DismissibleAlert>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <CommentRow key={comment.id} comment={comment} />
          ))}
        </ul>
      )}

      {canComment ? (
        <div className="space-y-2">
          <Textarea
            maxLength={MAX_COMMENT_LENGTH}
            placeholder="Add a comment…"
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
            }}
          />
          {submitError ? (
            <p className="text-sm text-red-600">{submitError}</p>
          ) : null}
          <div className="flex justify-end">
            <Button
              disabled={createMutation.isPending || trimmed.length === 0}
              onClick={handleSubmit}
              size="sm"
              type="button"
            >
              {createMutation.isPending ? "Posting…" : "Post comment"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CommentRow({ comment }: { comment: WorkflowRequestCommentResponse }) {
  return (
    <li className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {formatRequesterName(comment.author)}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatWorkflowRequestDateTime(comment.createdAt)}
        </p>
      </div>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
        {comment.content}
      </p>
    </li>
  );
}
