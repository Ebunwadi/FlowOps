import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  listOrganisationMembers,
  listOrganisationRoles,
  removeOrganisationMember,
  updateOrganisationMemberRole,
} from "@/api/members";
import { useAuth } from "@/auth/use-auth";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { ApiClientError } from "@/types/api";
import {
  formatMemberName,
  formatMemberStatus,
  type OrganisationMember,
  type OrganisationRole,
} from "@/types/member";

interface MembersTableProps {
  organisationId: string;
  canManage: boolean;
}

function formatJoinedDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function MembersTable({ organisationId, canManage }: MembersTableProps) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);

  const membersQuery = useQuery({
    queryKey: ["organisations", organisationId, "members"],
    queryFn: () => listOrganisationMembers(organisationId),
  });

  const rolesQuery = useQuery({
    queryKey: ["organisations", organisationId, "roles"],
    queryFn: () => listOrganisationRoles(organisationId),
    enabled: canManage,
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({
      memberId,
      roleId,
    }: {
      memberId: string;
      roleId: string;
    }) => updateOrganisationMemberRole(organisationId, memberId, roleId),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({
        queryKey: ["organisations", organisationId, "members"],
      });
    },
    onError: (error) => {
      setActionError(getErrorMessage(error));
    },
    onSettled: () => {
      setPendingMemberId(null);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) =>
      removeOrganisationMember(organisationId, memberId),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({
        queryKey: ["organisations", organisationId, "members"],
      });
    },
    onError: (error) => {
      setActionError(getErrorMessage(error));
    },
    onSettled: () => {
      setPendingMemberId(null);
    },
  });

  if (membersQuery.isLoading) {
    return <MembersTableSkeleton />;
  }

  if (membersQuery.isError) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {getErrorMessage(membersQuery.error)}
      </div>
    );
  }

  const members = membersQuery.data ?? [];
  const roles = rolesQuery.data ?? [];

  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-6 py-12 text-center">
        <h3 className="text-lg font-medium">No members yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Organisation members will appear here once people join the workspace.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {actionError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Role</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Joined</th>
              {canManage ? (
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y bg-card">
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                roles={roles}
                canManage={canManage}
                isSelf={profile?.id === member.userId}
                isPending={pendingMemberId === member.id}
                onRoleChange={(roleId) => {
                  setPendingMemberId(member.id);
                  updateRoleMutation.mutate({ memberId: member.id, roleId });
                }}
                onRemove={() => {
                  const confirmed = window.confirm(
                    `Remove ${formatMemberName(member)} from this organisation?`,
                  );

                  if (!confirmed) {
                    return;
                  }

                  setPendingMemberId(member.id);
                  removeMemberMutation.mutate(member.id);
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface MemberRowProps {
  member: OrganisationMember;
  roles: OrganisationRole[];
  canManage: boolean;
  isSelf: boolean;
  isPending: boolean;
  onRoleChange: (roleId: string) => void;
  onRemove: () => void;
}

function MemberRow({
  member,
  roles,
  canManage,
  isSelf,
  isPending,
  onRoleChange,
  onRemove,
}: MemberRowProps) {
  return (
    <tr>
      <td className="px-4 py-3 font-medium">{formatMemberName(member)}</td>
      <td className="px-4 py-3 text-muted-foreground">{member.email}</td>
      <td className="px-4 py-3">
        {canManage && roles.length > 0 ? (
          <Select
            className="min-w-[140px]"
            disabled={isPending}
            value={member.role.id}
            onChange={(event) => {
              onRoleChange(event.target.value);
            }}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
        ) : (
          member.role.name
        )}
      </td>
      <td className="px-4 py-3">
        <StatusBadge
          label={formatMemberStatus(member.status)}
          status={member.status}
        />
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {formatJoinedDate(member.joinedAt)}
      </td>
      {canManage ? (
        <td className="px-4 py-3 text-right">
          <Button
            disabled={isPending || isSelf}
            onClick={onRemove}
            size="sm"
            type="button"
            variant="outline"
          >
            Remove
          </Button>
        </td>
      ) : null}
    </tr>
  );
}

function MembersTableSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-10 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}
