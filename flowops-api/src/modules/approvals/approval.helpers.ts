import { DEFAULT_ROLE_NAMES } from "../roles/default-roles";
import {
  getFirstEligibleWorkflowStep,
  getNextEligibleWorkflowStep,
  type WorkflowStepWithCondition,
} from "./step-condition";

export interface WorkflowStepOrderRef extends WorkflowStepWithCondition {
  id: string;
  stepOrder: number;
}

export { getFirstEligibleWorkflowStep, getNextEligibleWorkflowStep };

export function isOrganisationOwnerRole(roleName: string): boolean {
  return roleName === DEFAULT_ROLE_NAMES.OWNER;
}

export function getNextWorkflowStep<T extends WorkflowStepOrderRef>(
  steps: T[],
  currentStepId: string,
): T | null {
  const sortedSteps = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
  const currentIndex = sortedSteps.findIndex((step) => step.id === currentStepId);

  if (currentIndex === -1) {
    return null;
  }

  return sortedSteps[currentIndex + 1] ?? null;
}

export function canActAsCurrentApprover(
  viewer: { roleId: string; roleName: string },
  currentStepApproverRoleId: string,
): boolean {
  if (isOrganisationOwnerRole(viewer.roleName)) {
    return true;
  }

  return viewer.roleId === currentStepApproverRoleId;
}
