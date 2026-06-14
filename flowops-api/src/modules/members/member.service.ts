import {
  ConflictError,
  NotFoundError,
} from "../../common/errors/httpErrors";
import { recordAuditEvent } from "../audit-log/audit-log.service";
import { DEFAULT_ROLE_NAMES } from "../roles/default-roles";
import { toOrganisationMemberResponse } from "./member.mapper";
import {
  countActiveOwnersInOrganisation,
  deleteMemberById,
  findMemberByIdInOrganisation,
  findMembersByOrganisationId,
  findRoleByIdInOrganisation,
  updateMemberRoleById,
} from "./member.repository";
import type { UpdateMemberRoleBody } from "./member.validation";

async function assertNotLastOwnerRemoval(
  organisationId: string,
  memberRoleName: string,
): Promise<void> {
  if (memberRoleName !== DEFAULT_ROLE_NAMES.OWNER) {
    return;
  }

  const ownerCount = await countActiveOwnersInOrganisation(organisationId);

  if (ownerCount <= 1) {
    throw new ConflictError("The organisation must have at least one Owner");
  }
}

async function assertValidOrganisationRole(
  organisationId: string,
  roleId: string,
): Promise<{ id: string; name: string }> {
  const role = await findRoleByIdInOrganisation(roleId, organisationId);

  if (!role) {
    throw new NotFoundError("Role not found in this organisation");
  }

  return role;
}

export async function listOrganisationMembers(organisationId: string) {
  const members = await findMembersByOrganisationId(organisationId);

  return members.map(toOrganisationMemberResponse);
}

export async function updateOrganisationMemberRole(
  organisationId: string,
  memberId: string,
  actorUserId: string,
  input: UpdateMemberRoleBody,
) {
  const member = await findMemberByIdInOrganisation(memberId, organisationId);

  if (!member) {
    throw new NotFoundError("Member not found");
  }

  const nextRole = await assertValidOrganisationRole(organisationId, input.roleId);

  if (
    member.role.name === DEFAULT_ROLE_NAMES.OWNER &&
    nextRole.name !== DEFAULT_ROLE_NAMES.OWNER
  ) {
    await assertNotLastOwnerRemoval(organisationId, member.role.name);
  }

  const updatedMember = await updateMemberRoleById(memberId, input.roleId);

  recordAuditEvent({
    action: "member.role.updated",
    organisationId,
    actorUserId,
    targetUserId: member.userId,
    targetMemberId: memberId,
    metadata: {
      previousRoleId: member.roleId,
      previousRoleName: member.role.name,
      nextRoleId: nextRole.id,
      nextRoleName: nextRole.name,
    },
  });

  return toOrganisationMemberResponse(updatedMember);
}

export async function removeOrganisationMember(
  organisationId: string,
  memberId: string,
  actorUserId: string,
) {
  const member = await findMemberByIdInOrganisation(memberId, organisationId);

  if (!member) {
    throw new NotFoundError("Member not found");
  }

  await assertNotLastOwnerRemoval(organisationId, member.role.name);

  await deleteMemberById(memberId);

  recordAuditEvent({
    action: "member.removed",
    organisationId,
    actorUserId,
    targetUserId: member.userId,
    targetMemberId: memberId,
    metadata: {
      roleId: member.roleId,
      roleName: member.role.name,
    },
  });
}
