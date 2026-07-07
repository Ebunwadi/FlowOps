import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";

import {
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  listWebhookDeliveries,
  listWebhookEndpoints,
  updateWebhookEndpoint,
} from "@/api/webhooks";
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
import type {
  CreatedWebhookEndpoint,
  WebhookEndpointSummary,
  WebhookEventType,
} from "@/types/webhook";
import {
  WEBHOOK_EVENT_LABELS,
  WEBHOOK_EVENT_TYPES,
} from "@/types/webhook";

function formatWebhookDate(value: string | null): string {
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

function formatCreatorName(endpoint: WebhookEndpointSummary): string {
  const parts = [
    endpoint.createdBy.firstName,
    endpoint.createdBy.lastName,
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(" ");
  }

  return endpoint.createdBy.email;
}

function formatDeliveryStatus(status: string): string {
  switch (status) {
    case "DELIVERED":
      return "Delivered";
    case "FAILED":
      return "Failed";
    default:
      return "Pending";
  }
}

function CreatedWebhookSecretPanel({
  createdWebhook,
  onDismiss,
}: {
  createdWebhook: CreatedWebhookEndpoint;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(createdWebhook.secret);
      setCopied(true);
      setCopyError(null);
    } catch {
      setCopyError("Could not copy the signing secret. Copy it manually.");
    }
  };

  return (
    <Card className="border-amber-200 bg-amber-50/40">
      <CardHeader>
        <CardTitle className="text-lg">Save your webhook signing secret</CardTitle>
        <CardDescription>
          This is the only time FlowOps will show the secret for{" "}
          <span className="font-medium text-foreground">{createdWebhook.name}</span>.
          Use it to verify the <code className="text-xs">x-flowops-signature</code>{" "}
          header on incoming requests.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="break-all font-mono text-sm text-foreground">
            {createdWebhook.secret}
          </p>
        </div>

        {copyError ? (
          <DismissibleAlert variant="error">{copyError}</DismissibleAlert>
        ) : null}
        {copied ? (
          <DismissibleAlert variant="success">Secret copied to clipboard.</DismissibleAlert>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleCopy} type="button">
            Copy secret
          </Button>
          <Button onClick={onDismiss} type="button" variant="outline">
            I have saved this secret
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function WebhookEventCheckboxes({
  disabled,
  selectedEvents,
  onChange,
}: {
  disabled?: boolean;
  selectedEvents: WebhookEventType[];
  onChange: (events: WebhookEventType[]) => void;
}) {
  const toggleEvent = (eventType: WebhookEventType) => {
    if (selectedEvents.includes(eventType)) {
      onChange(selectedEvents.filter((item) => item !== eventType));
      return;
    }

    onChange([...selectedEvents, eventType]);
  };

  return (
    <div className="space-y-3">
      {WEBHOOK_EVENT_TYPES.map((eventType) => (
        <label
          key={eventType}
          className="flex items-start gap-3 rounded-lg border border-border p-3"
        >
          <input
            checked={selectedEvents.includes(eventType)}
            className="mt-1"
            disabled={disabled}
            onChange={() => toggleEvent(eventType)}
            type="checkbox"
          />
          <span className="space-y-1">
            <span className="block text-sm font-medium text-foreground">
              {WEBHOOK_EVENT_LABELS[eventType]}
            </span>
            <span className="block font-mono text-xs text-muted-foreground">
              {eventType}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

function WebhookDeliveriesPanel({
  endpoint,
  organisationId,
}: {
  endpoint: WebhookEndpointSummary;
  organisationId: string;
}) {
  const deliveriesQuery = useQuery({
    queryKey: ["webhooks", organisationId, endpoint.id, "deliveries"],
    queryFn: () => listWebhookDeliveries(endpoint.id),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent deliveries</CardTitle>
        <CardDescription>
          Latest delivery attempts for <strong>{endpoint.name}</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {deliveriesQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading deliveries…</p>
        ) : deliveriesQuery.isError ? (
          <DismissibleAlert variant="error">
            {formatApiErrorMessage(deliveriesQuery.error)}
          </DismissibleAlert>
        ) : deliveriesQuery.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">No deliveries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Event</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">HTTP</th>
                  <th className="px-3 py-2 font-medium">Attempts</th>
                  <th className="px-3 py-2 font-medium">Created</th>
                  <th className="px-3 py-2 font-medium">Delivered</th>
                </tr>
              </thead>
              <tbody>
                {deliveriesQuery.data?.map((delivery) => (
                  <tr key={delivery.id} className="border-b border-border/70">
                    <td className="px-3 py-3 font-mono text-xs">
                      {delivery.eventType}
                    </td>
                    <td className="px-3 py-3">
                      {formatDeliveryStatus(delivery.status)}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {delivery.responseStatus ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {delivery.attempts}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {formatWebhookDate(delivery.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {formatWebhookDate(delivery.deliveredAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function WebhooksSettingsPage() {
  const queryClient = useQueryClient();
  const { currentOrganisation } = useOrganisation();
  const { hasPermission, membershipAccessLoading } = usePermissions();
  const canManage = hasPermission("webhooks:manage");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventType[]>([
    "workflow.request.submitted",
  ]);
  const [createdWebhook, setCreatedWebhook] = useState<CreatedWebhookEndpoint | null>(
    null,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ["organisation-settings", currentOrganisation?.id],
    queryFn: getOrganisationSettings,
    enabled: Boolean(currentOrganisation?.id) && canManage,
  });

  const webhooksQuery = useQuery({
    queryKey: ["webhooks", currentOrganisation?.id],
    queryFn: listWebhookEndpoints,
    enabled: Boolean(currentOrganisation?.id) && canManage,
  });

  const createMutation = useMutation({
    mutationFn: createWebhookEndpoint,
    onSuccess: async (data) => {
      setCreatedWebhook(data);
      setShowCreateForm(false);
      setName("");
      setUrl("");
      setSelectedEvents(["workflow.request.submitted"]);
      setFormError(null);
      await queryClient.invalidateQueries({
        queryKey: ["webhooks", currentOrganisation?.id],
      });
    },
    onError: (error) => {
      setFormError(formatApiErrorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      webhookId,
      input,
    }: {
      webhookId: string;
      input: { isActive?: boolean };
    }) => updateWebhookEndpoint(webhookId, input),
    onMutate: ({ webhookId }) => {
      setPendingActionId(webhookId);
      setActionError(null);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["webhooks", currentOrganisation?.id],
      });
    },
    onError: (error) => {
      setActionError(formatApiErrorMessage(error));
    },
    onSettled: () => {
      setPendingActionId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWebhookEndpoint,
    onMutate: (webhookId) => {
      setPendingActionId(webhookId);
      setActionError(null);
    },
    onSuccess: async (_data, webhookId) => {
      if (selectedEndpointId === webhookId) {
        setSelectedEndpointId(null);
      }
      await queryClient.invalidateQueries({
        queryKey: ["webhooks", currentOrganisation?.id],
      });
    },
    onError: (error) => {
      setActionError(formatApiErrorMessage(error));
    },
    onSettled: () => {
      setPendingActionId(null);
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
          <h1 className="text-[28px] font-semibold tracking-tight">Webhooks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You do not have permission to manage webhooks.
          </p>
        </div>
        <DismissibleAlert variant="warning">
          Contact an organisation admin if you need access to webhook management.
        </DismissibleAlert>
        <Button asChild type="button" variant="outline">
          <Link to="/settings">Back to settings</Link>
        </Button>
      </div>
    );
  }

  const webhooksEnabled = settingsQuery.data?.allowWebhooks ?? true;
  const selectedEndpoint = webhooksQuery.data?.find(
    (endpoint) => endpoint.id === selectedEndpointId,
  );

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();

    if (trimmedName.length < 2) {
      setFormError("Name must be at least 2 characters.");
      return;
    }

    if (!trimmedUrl) {
      setFormError("URL is required.");
      return;
    }

    if (selectedEvents.length === 0) {
      setFormError("Select at least one event.");
      return;
    }

    setFormError(null);
    createMutation.mutate({
      name: trimmedName,
      url: trimmedUrl,
      events: selectedEvents,
    });
  };

  const handleToggleActive = (endpoint: WebhookEndpointSummary) => {
    updateMutation.mutate({
      webhookId: endpoint.id,
      input: { isActive: !endpoint.isActive },
    });
  };

  const handleDelete = (endpoint: WebhookEndpointSummary) => {
    if (
      !window.confirm(
        `Delete "${endpoint.name}"? FlowOps will stop sending events to this URL.`,
      )
    ) {
      return;
    }

    deleteMutation.mutate(endpoint.id);
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
            <span>Webhooks</span>
          </p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight">Webhooks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Register outbound endpoints that receive FlowOps workflow events for{" "}
            {currentOrganisation.name}.
          </p>
        </div>
        <Button asChild type="button" variant="outline">
          <Link to="/settings">Back to settings</Link>
        </Button>
      </div>

      {!webhooksEnabled ? (
        <DismissibleAlert variant="warning">
          Webhooks are disabled for this organisation. Enable them under Settings ?
          Organisation settings before creating new endpoints.
        </DismissibleAlert>
      ) : null}

      {createdWebhook ? (
        <CreatedWebhookSecretPanel
          createdWebhook={createdWebhook}
          onDismiss={() => setCreatedWebhook(null)}
        />
      ) : null}

      {actionError ? (
        <DismissibleAlert variant="error">{actionError}</DismissibleAlert>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-xl">Webhook endpoints</CardTitle>
            <CardDescription>
              FlowOps sends signed POST requests when subscribed events occur.
            </CardDescription>
          </div>
          <Button
            disabled={!webhooksEnabled || createMutation.isPending}
            onClick={() => setShowCreateForm((current) => !current)}
            type="button"
          >
            {showCreateForm ? "Cancel" : "Create webhook"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {showCreateForm ? (
            <form
              className="space-y-4 rounded-lg border border-border p-4"
              onSubmit={handleCreate}
            >
              <div className="space-y-2">
                <Label htmlFor="webhook-name">Name</Label>
                <Input
                  disabled={createMutation.isPending}
                  id="webhook-name"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Production notifications"
                  value={name}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Endpoint URL</Label>
                <Input
                  disabled={createMutation.isPending}
                  id="webhook-url"
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://example.com/webhooks/flowops"
                  type="url"
                  value={url}
                />
              </div>
              <div className="space-y-2">
                <Label>Subscribed events</Label>
                <WebhookEventCheckboxes
                  disabled={createMutation.isPending}
                  onChange={setSelectedEvents}
                  selectedEvents={selectedEvents}
                />
              </div>
              {formError ? (
                <DismissibleAlert variant="error">{formError}</DismissibleAlert>
              ) : null}
              <Button disabled={createMutation.isPending} type="submit">
                {createMutation.isPending ? "Creating…" : "Create webhook"}
              </Button>
            </form>
          ) : null}

          {webhooksQuery.isLoading || settingsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading webhooks…</p>
          ) : webhooksQuery.isError ? (
            <DismissibleAlert variant="error">
              {formatApiErrorMessage(webhooksQuery.error)}
            </DismissibleAlert>
          ) : webhooksQuery.data?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No webhook endpoints yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">URL</th>
                    <th className="px-3 py-2 font-medium">Events</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Created by</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {webhooksQuery.data?.map((endpoint) => (
                    <tr key={endpoint.id} className="border-b border-border/70">
                      <td className="px-3 py-3 font-medium">{endpoint.name}</td>
                      <td className="max-w-xs truncate px-3 py-3 font-mono text-xs text-muted-foreground">
                        {endpoint.url}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {endpoint.events.length}
                      </td>
                      <td className="px-3 py-3">
                        {endpoint.isActive ? "Active" : "Disabled"}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {formatCreatorName(endpoint)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={() =>
                              setSelectedEndpointId((current) =>
                                current === endpoint.id ? null : endpoint.id,
                              )
                            }
                            type="button"
                            variant="outline"
                          >
                            {selectedEndpointId === endpoint.id
                              ? "Hide deliveries"
                              : "View deliveries"}
                          </Button>
                          <Button
                            disabled={pendingActionId === endpoint.id}
                            onClick={() => handleToggleActive(endpoint)}
                            type="button"
                            variant="outline"
                          >
                            {pendingActionId === endpoint.id
                              ? "Saving…"
                              : endpoint.isActive
                                ? "Disable"
                                : "Enable"}
                          </Button>
                          <Button
                            disabled={pendingActionId === endpoint.id}
                            onClick={() => handleDelete(endpoint)}
                            type="button"
                            variant="outline"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedEndpoint ? (
        <WebhookDeliveriesPanel
          endpoint={selectedEndpoint}
          organisationId={currentOrganisation.id}
        />
      ) : null}
    </div>
  );
}
