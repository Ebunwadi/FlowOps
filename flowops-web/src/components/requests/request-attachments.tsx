import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  deleteAttachment,
  downloadAttachment,
  uploadWorkflowRequestAttachment,
} from "@/api/attachments";
import { FileUpload } from "@/components/requests/file-upload";
import { Button } from "@/components/ui/button";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { formatApiErrorMessage } from "@/lib/api-errors";
import {
  formatAttachmentFileSize,
  type WorkflowRequestAttachment,
} from "@/types/attachment";
import {
  formatRequesterName,
  formatWorkflowRequestDateTime,
} from "@/types/workflow-request";

export function RequestAttachments({
  workflowRequestId,
  attachments,
  canUpload,
  canDeleteAttachment,
}: {
  workflowRequestId: string;
  attachments: WorkflowRequestAttachment[];
  canUpload: boolean;
  canDeleteAttachment: (attachment: WorkflowRequestAttachment) => boolean;
}) {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const invalidateRequest = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["workflow-request", workflowRequestId],
    });
  };

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      uploadWorkflowRequestAttachment(workflowRequestId, file),
    onSuccess: async () => {
      setActionError(null);
      await invalidateRequest();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAttachment,
    onSuccess: async () => {
      setActionError(null);
      await invalidateRequest();
    },
    onError: (error) => {
      setActionError(formatApiErrorMessage(error));
    },
  });

  const handleDownload = async (attachment: WorkflowRequestAttachment) => {
    setActionError(null);
    setDownloadingId(attachment.id);

    try {
      await downloadAttachment(attachment.id, attachment.originalFileName);
    } catch (error) {
      setActionError(formatApiErrorMessage(error));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = (attachment: WorkflowRequestAttachment) => {
    if (
      !window.confirm(
        `Delete "${attachment.originalFileName}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setDeletingId(attachment.id);
    deleteMutation.mutate(attachment.id, {
      onSettled: () => {
        setDeletingId(null);
      },
    });
  };

  return (
    <div className="space-y-4">
      {actionError ? (
        <DismissibleAlert
          messageKey={actionError}
          onDismiss={() => {
            setActionError(null);
          }}
          variant="error"
        >
          {actionError}
        </DismissibleAlert>
      ) : null}

      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attachments yet.</p>
      ) : (
        <ul className="space-y-3">
          {attachments.map((attachment) => (
            <AttachmentRow
              attachment={attachment}
              canDelete={canDeleteAttachment(attachment)}
              deleting={deletingId === attachment.id || deleteMutation.isPending}
              downloading={downloadingId === attachment.id}
              key={attachment.id}
              onDelete={() => {
                handleDelete(attachment);
              }}
              onDownload={() => {
                void handleDownload(attachment);
              }}
            />
          ))}
        </ul>
      )}

      {canUpload ? (
        <FileUpload
          disabled={uploadMutation.isPending}
          onUpload={async (file) => {
            await uploadMutation.mutateAsync(file);
          }}
        />
      ) : null}
    </div>
  );
}

function AttachmentRow({
  attachment,
  canDelete,
  downloading,
  deleting,
  onDownload,
  onDelete,
}: {
  attachment: WorkflowRequestAttachment;
  canDelete: boolean;
  downloading: boolean;
  deleting: boolean;
  onDownload: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-medium text-foreground">
            {attachment.originalFileName}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatAttachmentFileSize(attachment.fileSize)} � Uploaded by{" "}
            {formatRequesterName(attachment.uploadedBy)} �{" "}
            {formatWorkflowRequestDateTime(attachment.createdAt)}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            disabled={downloading || deleting}
            onClick={onDownload}
            size="sm"
            type="button"
            variant="outline"
          >
            {downloading ? "Downloading�" : "Download"}
          </Button>
          {canDelete ? (
            <Button
              disabled={downloading || deleting}
              onClick={onDelete}
              size="sm"
              type="button"
              variant="outline"
            >
              {deleting ? "Deleting�" : "Delete"}
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}
