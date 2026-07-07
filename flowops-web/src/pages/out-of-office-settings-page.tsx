import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { listOrganisationMembers } from "@/api/members";
import {
  createOutOfOfficeRule,
  listOutOfOfficeRules,
  updateOutOfOfficeRule,
} from "@/api/out-of-office";
import { useAuth } from "@/auth/use-auth";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatApiErrorMessage } from "@/lib/api-errors";
import { formatMemberName, type OrganisationMember } from "@/types/member";
import {
  formatOutOfOfficeRuleStatus,
  formatOutOfOfficeUserName,
  getOutOfOfficeRuleStatus,
  type OutOfOfficeRule,
} from "@/types/out-of-office";

function fromDatetimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}

function formatRuleDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RuleStatusBadge({ rule }: { rule: OutOfOfficeRule }) {
  const status = getOutOfOfficeRuleStatus(rule);
  const toneClass =
    status === "active"
      ? "bg-emerald-100 text-emerald-800"
      : status === "scheduled"
        ? "bg-blue-100 text-blue-800"
        : status === "expired"
          ? "bg-muted text-muted-foreground"
          : "bg-amber-100 text-amber-800";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClass}`}
    >
      {formatOutOfOfficeRuleStatus(status)}
    </span>
  );
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
        className="mt-1 h-4 w-4 rounded border-input"
        disabled={disabled}
        id={id}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
        type="checkbox"
      />
    </div>
  );
}

export function OutOfOfficeSettingsPage() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { currentOrganisation } = useOrganisation();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [delegateToId, setDelegateToId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingRuleId, setUpdatingRuleId] = useState<string | null>(null);

  const rulesQuery = useQuery({
    queryKey: ["out-of-office-rules", currentOrganisation?.id],
    queryFn: listOutOfOfficeRules,
    enabled: Boolean(currentOrganisation?.id),
  });

  const membersQuery = useQuery({
    queryKey: ["organisation-members", currentOrganisation?.id],
    queryFn: () => listOrganisationMembers(currentOrganisation!.id),
    enabled: Boolean(currentOrganisation?.id),
  });

  const delegateOptions = useMemo(() => {
    const members = membersQuery.data ?? [];

    return members.filter(
      (member) =>
        member.status === "ACTIVE" &&
        member.userId !== profile?.id &&
        member.userId.length > 0,
    );
  }, [membersQuery.data, profile?.id]);

  const createMutation = useMutation({
    mutationFn: createOutOfOfficeRule,
    onSuccess: async () => {
      setShowCreateForm(false);
      setDelegateToId("");
      setStartsAt("");
      setEndsAt("");
      setFormError(null);
      await queryClient.invalidateQueries({
        queryKey: ["out-of-office-rules", currentOrganisation?.id],
      });
    },
    onError: (error) => {
      setFormError(formatApiErrorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      ruleId,
      input,
    }: {
      ruleId: string;
      input: Parameters<typeof updateOutOfOfficeRule>[1];
    }) => updateOutOfOfficeRule(ruleId, input),
    onMutate: ({ ruleId }) => {
      setUpdatingRuleId(ruleId);
      setActionError(null);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["out-of-office-rules", currentOrganisation?.id],
      });
    },
    onError: (error) => {
      setActionError(formatApiErrorMessage(error));
    },
    onSettled: () => {
      setUpdatingRuleId(null);
    },
  });

  if (!currentOrganisation) {
    return <Navigate replace to="/organisation/setup" />;
  }

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!delegateToId) {
      setFormError("Choose a delegate.");
      return;
    }

    if (!startsAt || !endsAt) {
      setFormError("Start and end dates are required.");
      return;
    }

    const startDate = new Date(startsAt);
    const endDate = new Date(endsAt);

    if (startDate >= endDate) {
      setFormError("Start must be before end.");
      return;
    }

    setFormError(null);
    createMutation.mutate({
      delegateToId,
      startsAt: fromDatetimeLocalValue(startsAt),
      endsAt: fromDatetimeLocalValue(endsAt),
    });
  };

  const handleToggleRule = (rule: OutOfOfficeRule, isActive: boolean) => {
    updateMutation.mutate({
      ruleId: rule.id,
      input: { isActive },
    });
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
            <span>Out of office</span>
          </p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight">Out of office</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Route approval notifications to a colleague while you are away from{" "}
            {currentOrganisation.name}.
          </p>
        </div>
        <Button asChild type="button" variant="outline">
          <Link to="/settings">Back to settings</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">How reassignment works</CardTitle>
          <CardDescription>
            When you are out of office, FlowOps sends approval notifications to
            your delegate instead. They can review those requests from pending
            approvals without needing your role.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Reassignments are recorded in the audit log. Other members with the
          same approver role can still act on requests unless a step is delegated
          to one person only.
        </CardContent>
      </Card>

      {actionError ? (
        <DismissibleAlert variant="error">{actionError}</DismissibleAlert>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-xl">Your rules</CardTitle>
            <CardDescription>
              Create date-bounded rules and disable them when you return.
            </CardDescription>
          </div>
          <Button
            disabled={createMutation.isPending}
            onClick={() => setShowCreateForm((current) => !current)}
            type="button"
          >
            {showCreateForm ? "Cancel" : "Create rule"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {showCreateForm ? (
            <form
              className="space-y-4 rounded-lg border border-border p-4"
              onSubmit={handleCreate}
            >
              <div className="space-y-2">
                <Label htmlFor="ooo-delegate">Delegate</Label>
                <Select
                  disabled={createMutation.isPending || membersQuery.isLoading}
                  id="ooo-delegate"
                  onChange={(event) => setDelegateToId(event.target.value)}
                  value={delegateToId}
                >
                  <option value="">Select a colleagueù</option>
                  {delegateOptions.map((member: OrganisationMember) => (
                    <option key={member.userId} value={member.userId}>
                      {formatMemberName(member)} ({member.role.name})
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ooo-starts-at">Starts</Label>
                  <Input
                    disabled={createMutation.isPending}
                    id="ooo-starts-at"
                    onChange={(event) => setStartsAt(event.target.value)}
                    type="datetime-local"
                    value={startsAt}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ooo-ends-at">Ends</Label>
                  <Input
                    disabled={createMutation.isPending}
                    id="ooo-ends-at"
                    onChange={(event) => setEndsAt(event.target.value)}
                    type="datetime-local"
                    value={endsAt}
                  />
                </div>
              </div>
              {formError ? (
                <DismissibleAlert variant="error">{formError}</DismissibleAlert>
              ) : null}
              <Button disabled={createMutation.isPending} type="submit">
                {createMutation.isPending ? "Creatingù" : "Create rule"}
              </Button>
            </form>
          ) : null}

          {rulesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading rulesù</p>
          ) : rulesQuery.isError ? (
            <DismissibleAlert variant="error">
              {formatApiErrorMessage(rulesQuery.error)}
            </DismissibleAlert>
          ) : rulesQuery.data?.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No out-of-office rules yet. Create one before your next absence.
            </p>
          ) : (
            <div className="space-y-4">
              {rulesQuery.data?.map((rule) => (
                <div
                  key={rule.id}
                  className="space-y-4 rounded-lg border border-border p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">
                          Delegate: {formatOutOfOfficeUserName(rule.delegateTo)}
                        </p>
                        <RuleStatusBadge rule={rule} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatRuleDateTime(rule.startsAt)} ?{" "}
                        {formatRuleDateTime(rule.endsAt)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created {formatRuleDateTime(rule.createdAt)}
                      </p>
                    </div>
                    <SettingsToggle
                      checked={rule.isActive}
                      description="Turn off when you are back."
                      disabled={updatingRuleId === rule.id}
                      id={`ooo-active-${rule.id}`}
                      label="Rule enabled"
                      onChange={(isActive) => handleToggleRule(rule, isActive)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
