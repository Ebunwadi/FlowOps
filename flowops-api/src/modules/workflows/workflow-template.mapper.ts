import type {
  WorkflowFieldType,
  WorkflowTemplateStatus,
} from "../../generated/prisma/client";
import type { Prisma } from "../../generated/prisma/client";

export interface CreatedWorkflowTemplateSummary {
  id: string;
  name: string;
  status: WorkflowTemplateStatus;
  isActive: boolean;
  fieldsCount: number;
  stepsCount: number;
}

export interface WorkflowTemplateStatusResponse {
  id: string;
  name: string;
  status: WorkflowTemplateStatus;
  isActive: boolean;
}

export interface WorkflowTemplateListItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  status: WorkflowTemplateStatus;
  isActive: boolean;
  fieldsCount: number;
  stepsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowTemplateFieldResponse {
  id: string;
  label: string;
  fieldKey: string;
  fieldType: WorkflowFieldType;
  helpText: string | null;
  placeholder: string | null;
  isRequired: boolean;
  options: Prisma.JsonValue;
  validationRules: Prisma.JsonValue;
  fieldOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowTemplateStepResponse {
  id: string;
  name: string;
  description: string | null;
  stepOrder: number;
  approverRoleId: string;
  slaHours: number | null;
  allowDelegation: boolean;
  condition: Prisma.JsonValue;
  approverRole: {
    id: string;
    name: string;
    description: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowTemplateDetailResponse {
  id: string;
  organisationId: string;
  name: string;
  description: string | null;
  category: string | null;
  status: WorkflowTemplateStatus;
  isActive: boolean;
  createdById: string;
  fieldsCount: number;
  stepsCount: number;
  fields: WorkflowTemplateFieldResponse[];
  steps: WorkflowTemplateStepResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedWorkflowTemplatesResponse {
  items: WorkflowTemplateListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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

export function toWorkflowTemplateStatusResponse(template: {
  id: string;
  name: string;
  status: WorkflowTemplateStatus;
  isActive: boolean;
}): WorkflowTemplateStatusResponse {
  return {
    id: template.id,
    name: template.name,
    status: template.status,
    isActive: template.isActive,
  };
}

export function toWorkflowTemplateListItem(template: {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  status: WorkflowTemplateStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    fields: number;
    steps: number;
  };
}): WorkflowTemplateListItem {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    status: template.status,
    isActive: template.isActive,
    fieldsCount: template._count.fields,
    stepsCount: template._count.steps,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

export function toWorkflowTemplateDetailResponse(template: {
  id: string;
  organisationId: string;
  name: string;
  description: string | null;
  category: string | null;
  status: WorkflowTemplateStatus;
  isActive: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  fields: Array<{
    id: string;
    label: string;
    fieldKey: string;
    fieldType: WorkflowFieldType;
    helpText: string | null;
    placeholder: string | null;
    isRequired: boolean;
    options: Prisma.JsonValue;
    validationRules: Prisma.JsonValue;
    fieldOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
  steps: Array<{
    id: string;
    name: string;
    description: string | null;
    stepOrder: number;
    approverRoleId: string;
    slaHours: number | null;
    allowDelegation: boolean;
    condition: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
    approverRole: {
      id: string;
      name: string;
      description: string | null;
    };
  }>;
}): WorkflowTemplateDetailResponse {
  return {
    id: template.id,
    organisationId: template.organisationId,
    name: template.name,
    description: template.description,
    category: template.category,
    status: template.status,
    isActive: template.isActive,
    createdById: template.createdById,
    fieldsCount: template.fields.length,
    stepsCount: template.steps.length,
    fields: template.fields.map((field) => ({
      id: field.id,
      label: field.label,
      fieldKey: field.fieldKey,
      fieldType: field.fieldType,
      helpText: field.helpText,
      placeholder: field.placeholder,
      isRequired: field.isRequired,
      options: field.options,
      validationRules: field.validationRules,
      fieldOrder: field.fieldOrder,
      createdAt: field.createdAt.toISOString(),
      updatedAt: field.updatedAt.toISOString(),
    })),
    steps: template.steps.map((step) => ({
      id: step.id,
      name: step.name,
      description: step.description,
      stepOrder: step.stepOrder,
      approverRoleId: step.approverRoleId,
      slaHours: step.slaHours,
      allowDelegation: step.allowDelegation,
      condition: step.condition,
      approverRole: {
        id: step.approverRole.id,
        name: step.approverRole.name,
        description: step.approverRole.description,
      },
      createdAt: step.createdAt.toISOString(),
      updatedAt: step.updatedAt.toISOString(),
    })),
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}
