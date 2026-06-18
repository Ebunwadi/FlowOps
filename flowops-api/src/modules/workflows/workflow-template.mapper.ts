import type { WorkflowTemplateStatus } from "../../generated/prisma/client";

export interface CreatedWorkflowTemplateSummary {
  id: string;
  name: string;
  status: WorkflowTemplateStatus;
  isActive: boolean;
  fieldsCount: number;
  stepsCount: number;
}

export function toCreatedWorkflowTemplateSummary(template: {
  id: string;
  name: string;
  status: WorkflowTemplateStatus;
  isActive: boolean;
  _count: {
    fields: number;
    steps: number;
  };
}): CreatedWorkflowTemplateSummary {
  return {
    id: template.id,
    name: template.name,
    status: template.status,
    isActive: template.isActive,
    fieldsCount: template._count.fields,
    stepsCount: template._count.steps,
  };
}
