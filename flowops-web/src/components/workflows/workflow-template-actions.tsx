import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  activateWorkflowTemplate,
  archiveWorkflowTemplate,
  deactivateWorkflowTemplate,
} from "@/api/workflow-templates";
import { Button } from "@/components/ui/button";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { formatApiErrorMessage } from "@/lib/api-errors";
import type { WorkflowTemplateStatus } from "@/types/workflow-template";

interface WorkflowTemplateActionsProps {
  templateId: string;
  templateName: string;
  status: WorkflowTemplateStatus;
  canActivate: boolean;
  canDeactivate: boolean;
  canArchive: boolean;
}

export function WorkflowTemplateActions({
  templateId,
  templateName,
  status,
  canActivate,
  canDeactivate,
  canArchive,
}: WorkflowTemplateActionsProps) {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const statusMutation = useMutation({
    mutationFn: async (action: "activate" | "deactivate" | "archive") => {
      if (action === "activate") {
        return activateWorkflowTemplate(templateId);
      }

      if (action === "deactivate") {
        return deactivateWorkflowTemplate(templateId);
      }

      return archiveWorkflowTemplate(templateId);
    },
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
      await queryClient.invalidateQueries({ queryKey: ["workflow-templates", templateId] });
    },
    onError: (error) => {
      setActionError(getErrorMessage(error));
    },
  });

  const showActivate =
    canActivate && (status === "DRAFT" || status === "INACTIVE");
  const showDeactivate = canDeactivate && status === "ACTIVE";
  const showArchive = canArchive && status !== "ARCHIVED";

  if (!showActivate && !showDeactivate && !showArchive) {
    return null;
  }

  const handleAction = (action: "activate" | "deactivate" | "archive") => {
    const confirmMessages: Record<typeof action, string> = {
      activate: `Activate "${templateName}"? It will become available for new requests.`,
      deactivate: `Deactivate "${templateName}"? New requests will no longer use this template.`,
      archive: `Archive "${templateName}"? This template will be hidden from the default list.`,
    };

    if (!window.confirm(confirmMessages[action])) {
      return;
    }

    statusMutation.mutate(action);
  };

  return (
    <div className="space-y-3">
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

      <div className="flex flex-wrap gap-2">
        {showActivate ? (
          <Button
            disabled={statusMutation.isPending}
            onClick={() => {
              handleAction("activate");
            }}
            size="sm"
            type="button"
          >
            Activate
          </Button>
        ) : null}
        {showDeactivate ? (
          <Button
            disabled={statusMutation.isPending}
            onClick={() => {
              handleAction("deactivate");
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            Deactivate
          </Button>
        ) : null}
        {showArchive ? (
          <Button
            disabled={statusMutation.isPending}
            onClick={() => {
              handleAction("archive");
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            Archive
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function getErrorMessage(error: unknown): string {
  return formatApiErrorMessage(error);
}
