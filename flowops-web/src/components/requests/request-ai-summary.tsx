import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { generateWorkflowRequestSummary } from "@/api/ai";
import { getOrganisationSettings } from "@/api/organisation-settings";
import { useOrganisation } from "@/auth/use-organisation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { formatApiErrorMessage } from "@/lib/api-errors";

interface RequestAiSummaryProps {
  workflowRequestId: string;
}

export function RequestAiSummary({ workflowRequestId }: RequestAiSummaryProps) {
  const { currentOrganisation } = useOrganisation();
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ["organisation-settings", currentOrganisation?.id],
    queryFn: getOrganisationSettings,
    enabled: Boolean(currentOrganisation?.id),
  });

  const summaryMutation = useMutation({
    mutationFn: () => generateWorkflowRequestSummary(workflowRequestId),
    onMutate: () => {
      setError(null);
    },
    onSuccess: (data) => {
      setSummary(data.summary);
    },
    onError: (mutationError) => {
      setError(formatApiErrorMessage(mutationError));
    },
  });

  if (settingsQuery.isLoading) {
    return null;
  }

  if (settingsQuery.data?.allowAiFeatures === false) {
    return null;
  }

  const handleGenerate = () => {
    summaryMutation.mutate();
  };

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">AI summary</CardTitle>
        <CardDescription>
          Generate a short overview of this request, its submitted values, and
          approval progress.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <DismissibleAlert variant="warning">
          AI-generated summaries are drafts for review only. Confirm important
          details against the request record before acting on them.
        </DismissibleAlert>

        {error ? (
          <DismissibleAlert messageKey={error} variant="error">
            {error}
          </DismissibleAlert>
        ) : null}

        {summaryMutation.isPending ? (
          <p className="text-sm text-muted-foreground">Generating summary…</p>
        ) : null}

        {summary ? (
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
              {summary}
            </p>
          </div>
        ) : !summaryMutation.isPending ? (
          <p className="text-sm text-muted-foreground">
            No summary generated yet. Use the button below to create one from
            the current request data.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={summaryMutation.isPending}
            onClick={handleGenerate}
            type="button"
          >
            {summaryMutation.isPending
              ? "Generating…"
              : summary
                ? "Regenerate summary"
                : "Generate summary"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
