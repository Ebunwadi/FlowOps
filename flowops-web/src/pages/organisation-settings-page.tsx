import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import {
  getOrganisationSettings,
  updateOrganisationSettings,
} from "@/api/organisation-settings";
import { useOrganisation } from "@/auth/use-organisation";
import { usePermissions } from "@/auth/use-permissions";
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
import type { UpdateOrganisationSettingsInput } from "@/types/organisation-settings";

interface SettingsFormState {
  allowAiFeatures: boolean;
  allowWebhooks: boolean;
  allowApiKeys: boolean;
  defaultSlaHours: string;
  requireCommentsOnReject: boolean;
}

function toFormState(
  settings: Awaited<ReturnType<typeof getOrganisationSettings>>,
): SettingsFormState {
  return {
    allowAiFeatures: settings.allowAiFeatures,
    allowWebhooks: settings.allowWebhooks,
    allowApiKeys: settings.allowApiKeys,
    defaultSlaHours:
      settings.defaultSlaHours === null ? "" : String(settings.defaultSlaHours),
    requireCommentsOnReject: settings.requireCommentsOnReject,
  };
}

function toUpdateInput(form: SettingsFormState): UpdateOrganisationSettingsInput {
  const defaultSlaHours =
    form.defaultSlaHours.trim() === ""
      ? null
      : Number.parseInt(form.defaultSlaHours, 10);

  return {
    allowAiFeatures: form.allowAiFeatures,
    allowWebhooks: form.allowWebhooks,
    allowApiKeys: form.allowApiKeys,
    defaultSlaHours,
    requireCommentsOnReject: form.requireCommentsOnReject,
  };
}

function SettingsToggle({
  checked,
  description,
  disabled,
  id,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  disabled?: boolean;
  id: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
      <div className="space-y-1">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <input
        checked={checked}
        className="mt-1 h-4 w-4 accent-primary"
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </div>
  );
}

export function OrganisationSettingsPage() {
  const { currentOrganisation } = useOrganisation();
  const { hasPermission, membershipAccessLoading } = usePermissions();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SettingsFormState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const canView = hasPermission("settings:view");
  const canUpdate = hasPermission("settings:update");

  const settingsQuery = useQuery({
    queryKey: ["organisation-settings", currentOrganisation?.id],
    queryFn: getOrganisationSettings,
    enabled: Boolean(currentOrganisation && canView),
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setForm(toFormState(settingsQuery.data));
    }
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: updateOrganisationSettings,
    onSuccess: async (data) => {
      setForm(toFormState(data));
      setSaveError(null);
      setSaveSuccess(true);
      await queryClient.invalidateQueries({
        queryKey: ["organisation-settings", currentOrganisation?.id],
      });
    },
    onError: (error: Error) => {
      setSaveSuccess(false);
      setSaveError(error.message);
    },
  });

  if (!currentOrganisation) {
    return <Navigate replace to="/organisation/setup" />;
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form || !canUpdate) {
      return;
    }

    const defaultSlaHours = form.defaultSlaHours.trim();
    if (
      defaultSlaHours !== "" &&
      (!Number.isInteger(Number(defaultSlaHours)) ||
        Number(defaultSlaHours) <= 0)
    ) {
      setSaveError("Default SLA hours must be a positive whole number.");
      setSaveSuccess(false);
      return;
    }

    setSaveError(null);
    setSaveSuccess(false);
    saveMutation.mutate(toUpdateInput(form));
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link className="hover:text-foreground" to="/settings">
            Settings
          </Link>
          <span className="mx-2">/</span>
          <span>Organisation</span>
        </p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-foreground">
          Organisation settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure features and defaults for {currentOrganisation.name}.
        </p>
      </div>

      {membershipAccessLoading ? (
        <p className="text-sm text-muted-foreground">Loading permissionsù</p>
      ) : !canView ? (
        <DismissibleAlert variant="warning">
          Your role does not include access to organisation settings. Contact an
          organisation admin if you need access.
        </DismissibleAlert>
      ) : settingsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading settingsù</p>
      ) : settingsQuery.isError ? (
        <DismissibleAlert variant="error">
          {settingsQuery.error instanceof Error
            ? settingsQuery.error.message
            : "Failed to load organisation settings."}
        </DismissibleAlert>
      ) : form ? (
        <form className="space-y-6" onSubmit={handleSubmit}>
          {saveError ? (
            <DismissibleAlert variant="error">{saveError}</DismissibleAlert>
          ) : null}
          {saveSuccess ? (
            <DismissibleAlert variant="success">
              Organisation settings saved successfully.
            </DismissibleAlert>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">General</CardTitle>
              <CardDescription>
                Organisation-wide defaults used across workflows and requests.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="defaultSlaHours">Default SLA hours</Label>
                <Input
                  disabled={!canUpdate || saveMutation.isPending}
                  id="defaultSlaHours"
                  inputMode="numeric"
                  min={1}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? { ...current, defaultSlaHours: event.target.value }
                        : current,
                    )
                  }
                  placeholder="Leave blank for no default"
                  type="number"
                  value={form.defaultSlaHours}
                />
                <p className="text-sm text-muted-foreground">
                  Optional target turnaround time in hours for new requests.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">AI settings</CardTitle>
              <CardDescription>
                Control AI-assisted workflow and request features.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsToggle
                checked={form.allowAiFeatures}
                description="Allow admins to generate workflow suggestions and users to generate request summaries."
                disabled={!canUpdate || saveMutation.isPending}
                id="allowAiFeatures"
                label="Enable AI features"
                onChange={(checked) =>
                  setForm((current) =>
                    current ? { ...current, allowAiFeatures: checked } : current,
                  )
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Webhook settings</CardTitle>
              <CardDescription>
                Allow this organisation to register outbound webhook endpoints.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsToggle
                checked={form.allowWebhooks}
                description="When disabled, webhook configuration and delivery are blocked."
                disabled={!canUpdate || saveMutation.isPending}
                id="allowWebhooks"
                label="Enable webhooks"
                onChange={(checked) =>
                  setForm((current) =>
                    current ? { ...current, allowWebhooks: checked } : current,
                  )
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">API access settings</CardTitle>
              <CardDescription>
                Control whether external systems can authenticate with API keys.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsToggle
                checked={form.allowApiKeys}
                description="When disabled, API key creation and authentication are blocked."
                disabled={!canUpdate || saveMutation.isPending}
                id="allowApiKeys"
                label="Enable API keys"
                onChange={(checked) =>
                  setForm((current) =>
                    current ? { ...current, allowApiKeys: checked } : current,
                  )
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Approval settings</CardTitle>
              <CardDescription>
                Rules that apply when approvers make decisions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsToggle
                checked={form.requireCommentsOnReject}
                description="Approvers must provide a comment when rejecting a request."
                disabled={!canUpdate || saveMutation.isPending}
                id="requireCommentsOnReject"
                label="Require rejection comment"
                onChange={(checked) =>
                  setForm((current) =>
                    current
                      ? { ...current, requireCommentsOnReject: checked }
                      : current,
                  )
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Notification settings</CardTitle>
              <CardDescription>
                Organisation-level notification preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Per-user notification preferences remain on the main settings
              page. Organisation-wide notification defaults will be added in a
              later sprint.
            </CardContent>
          </Card>

          {canUpdate ? (
            <div className="flex justify-end">
              <Button disabled={saveMutation.isPending} type="submit">
                {saveMutation.isPending ? "Savingù" : "Save changes"}
              </Button>
            </div>
          ) : (
            <DismissibleAlert variant="warning">
              You can view these settings but your role cannot update them.
            </DismissibleAlert>
          )}
        </form>
      ) : null}
    </div>
  );
}
