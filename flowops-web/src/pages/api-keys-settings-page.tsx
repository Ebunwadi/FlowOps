import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { createApiKey, listApiKeys, revokeApiKey } from "@/api/api-keys";
import { getOrganisationSettings } from "@/api/organisation-settings";
import { useOrganisation } from "@/auth/use-organisation";
import { usePermissions } from "@/auth/use-permissions";
import { AuthLoadingScreen } from "@/components/auth/auth-loading-screen";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatApiErrorMessage } from "@/lib/api-errors";
import type { ApiKeySummary, CreatedApiKey } from "@/types/api-key";

function formatApiKeyDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCreatorName(apiKey: ApiKeySummary): string {
  const parts = [apiKey.createdBy.firstName, apiKey.createdBy.lastName].filter(
    Boolean,
  );

  if (parts.length > 0) {
    return parts.join(" ");
  }

  return apiKey.createdBy.email;
}

function CreatedApiKeyPanel({
  createdKey,
  onDismiss,
}: {
  createdKey: CreatedApiKey;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(createdKey.rawKey);
      setCopied(true);
      setCopyError(null);
    } catch {
      setCopyError("Could not copy the API key. Copy it manually.");
    }
  };

  return (
    <Card className="border-amber-200 bg-amber-50/40">
      <CardHeader>
        <CardTitle className="text-lg">Save your API key</CardTitle>
        <CardDescription>
          This is the only time FlowOps will show the full key for{" "}
          <span className="font-medium text-foreground">{createdKey.name}</span>.
          Store it securely before closing this panel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="break-all font-mono text-sm text-foreground">
            {createdKey.rawKey}
          </p>
        </div>

        {copyError ? (
          <DismissibleAlert variant="error">{copyError}</DismissibleAlert>
        ) : null}
        {copied ? (
          <DismissibleAlert variant="success">API key copied to clipboard.</DismissibleAlert>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleCopy} type="button">
            Copy key
          </Button>
          <Button onClick={onDismiss} type="button" variant="outline">
            I have saved this key
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ApiKeysSettingsPage() {
  const queryClient = useQueryClient();
  const { currentOrganisation } = useOrganisation();
  const { hasPermission, membershipAccessLoading } = usePermissions();
  const canManage = hasPermission("apikeys:manage");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ["organisation-settings", currentOrganisation?.id],
    queryFn: getOrganisationSettings,
    enabled: Boolean(currentOrganisation?.id) && canManage,
  });

  const apiKeysQuery = useQuery({
    queryKey: ["api-keys", currentOrganisation?.id],
    queryFn: listApiKeys,
    enabled: Boolean(currentOrganisation?.id) && canManage,
  });

  const createMutation = useMutation({
    mutationFn: createApiKey,
    onSuccess: async (data) => {
      setCreatedKey(data);
      setShowCreateForm(false);
      setName("");
      setExpiresAt("");
      setFormError(null);
      await queryClient.invalidateQueries({
        queryKey: ["api-keys", currentOrganisation?.id],
      });
    },
    onError: (error) => {
      setFormError(formatApiErrorMessage(error));
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revokeApiKey,
    onMutate: (apiKeyId) => {
      setRevokingId(apiKeyId);
      setActionError(null);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["api-keys", currentOrganisation?.id],
      });
    },
    onError: (error) => {
      setActionError(formatApiErrorMessage(error));
    },
    onSettled: () => {
      setRevokingId(null);
    },
  });

  if (!currentOrganisation) {
    return <Navigate replace to="/organisation/setup" />;
  }

  if (membershipAccessLoading) {
    return <AuthLoadingScreen message="Checking your permissions..." />;
  }

  if (!canManage) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">API keys</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You do not have permission to manage API keys.
          </p>
        </div>
        <DismissibleAlert variant="warning">
          Contact an organisation admin if you need access to API key management.
        </DismissibleAlert>
        <Button asChild type="button" variant="outline">
          <Link to="/settings">Back to settings</Link>
        </Button>
      </div>
    );
  }

  const apiKeysEnabled = settingsQuery.data?.allowApiKeys ?? true;

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      setFormError("Name must be at least 2 characters.");
      return;
    }

    setFormError(null);
    createMutation.mutate({
      name: trimmedName,
      ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
    });
  };

  const handleRevoke = (apiKey: ApiKeySummary) => {
    if (apiKey.revokedAt) {
      return;
    }

    if (
      !window.confirm(
        `Revoke "${apiKey.name}"? External systems using this key will stop working immediately.`,
      )
    ) {
      return;
    }

    revokeMutation.mutate(apiKey.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link className="hover:text-foreground" to="/settings">
              Settings
            </Link>
            <span className="mx-2">/</span>
            <span>API keys</span>
          </p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight">API keys</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and revoke keys for external systems integrating with{" "}
            {currentOrganisation.name}.
          </p>
        </div>
        <Button asChild type="button" variant="outline">
          <Link to="/settings">Back to settings</Link>
        </Button>
      </div>

      {!apiKeysEnabled ? (
        <DismissibleAlert variant="warning">
          API keys are disabled for this organisation. Enable them under Settings ?
          Organisation settings before creating new keys.
        </DismissibleAlert>
      ) : null}

      {createdKey ? (
        <CreatedApiKeyPanel createdKey={createdKey} onDismiss={() => setCreatedKey(null)} />
      ) : null}

      {actionError ? (
        <DismissibleAlert variant="error">{actionError}</DismissibleAlert>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-xl">Active integrations</CardTitle>
            <CardDescription>
              Keys are shown by prefix only after creation. Revoked keys remain
              visible for audit purposes.
            </CardDescription>
          </div>
          <Button
            disabled={!apiKeysEnabled || createMutation.isPending}
            onClick={() => setShowCreateForm((current) => !current)}
            type="button"
          >
            {showCreateForm ? "Cancel" : "Create API key"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {showCreateForm ? (
            <form
              className="space-y-4 rounded-lg border border-border p-4"
              onSubmit={handleCreate}
            >
              <div className="space-y-2">
                <Label htmlFor="api-key-name">Key name</Label>
                <Input
                  disabled={createMutation.isPending}
                  id="api-key-name"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Production integration"
                  value={name}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-key-expires-at">Expiry date (optional)</Label>
                <Input
                  disabled={createMutation.isPending}
                  id="api-key-expires-at"
                  onChange={(event) => setExpiresAt(event.target.value)}
                  type="datetime-local"
                  value={expiresAt}
                />
              </div>
              {formError ? (
                <DismissibleAlert variant="error">{formError}</DismissibleAlert>
              ) : null}
              <Button disabled={createMutation.isPending} type="submit">
                {createMutation.isPending ? "Creating…" : "Create key"}
              </Button>
            </form>
          ) : null}

          {apiKeysQuery.isLoading || settingsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading API keys…</p>
          ) : apiKeysQuery.isError ? (
            <DismissibleAlert variant="error">
              {formatApiErrorMessage(apiKeysQuery.error)}
            </DismissibleAlert>
          ) : apiKeysQuery.data?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Prefix</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Last used</th>
                    <th className="px-3 py-2 font-medium">Expires</th>
                    <th className="px-3 py-2 font-medium">Created by</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeysQuery.data?.map((apiKey) => {
                    const isRevoked = Boolean(apiKey.revokedAt);

                    return (
                      <tr key={apiKey.id} className="border-b border-border/70">
                        <td className="px-3 py-3 font-medium">{apiKey.name}</td>
                        <td className="px-3 py-3 font-mono text-muted-foreground">
                          {apiKey.keyPrefix}…
                        </td>
                        <td className="px-3 py-3">
                          {isRevoked ? "Revoked" : "Active"}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {formatApiKeyDate(apiKey.lastUsedAt)}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {formatApiKeyDate(apiKey.expiresAt)}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {formatCreatorName(apiKey)}
                        </td>
                        <td className="px-3 py-3">
                          <Button
                            disabled={isRevoked || revokingId === apiKey.id}
                            onClick={() => handleRevoke(apiKey)}
                            type="button"
                            variant="outline"
                          >
                            {revokingId === apiKey.id ? "Revoking…" : "Revoke"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
