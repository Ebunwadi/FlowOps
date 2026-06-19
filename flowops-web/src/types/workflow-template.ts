export const WORKFLOW_TEMPLATE_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
] as const;

export type WorkflowTemplateStatus = (typeof WORKFLOW_TEMPLATE_STATUSES)[number];

export type WorkflowFieldType =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "NUMBER"
  | "DATE"
  | "DROPDOWN"
  | "CHECKBOX"
  | "RADIO"
  | "FILE_UPLOAD";

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

export interface WorkflowTemplateStatusResponse {
  id: string;
  name: string;
  status: WorkflowTemplateStatus;
  isActive: boolean;
}

export interface PaginatedWorkflowTemplatesResponse {
  items: WorkflowTemplateListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreatedWorkflowTemplateSummary {
  id: string;
  name: string;
  status: WorkflowTemplateStatus;
  isActive: boolean;
  fieldsCount: number;
  stepsCount: number;
}

export interface WorkflowTemplateField {
  id: string;
  label: string;
  fieldKey: string;
  fieldType: WorkflowFieldType;
  helpText: string | null;
  placeholder: string | null;
  isRequired: boolean;
  options: unknown;
  fieldOrder: number;
}

export interface WorkflowTemplateStep {
  id: string;
  name: string;
  description: string | null;
  stepOrder: number;
  approverRoleId: string;
  slaHours: number | null;
  allowDelegation: boolean;
  approverRole: {
    id: string;
    name: string;
    description: string | null;
  };
}

export interface WorkflowTemplateDetail {
  id: string;
  organisationId: string;
  name: string;
  description: string | null;
  category: string | null;
  status: WorkflowTemplateStatus;
  isActive: boolean;
  fieldsCount: number;
  stepsCount: number;
  fields: WorkflowTemplateField[];
  steps: WorkflowTemplateStep[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<WorkflowTemplateStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ARCHIVED: "Archived",
};

export function formatWorkflowTemplateStatus(status: WorkflowTemplateStatus): string {
  return STATUS_LABELS[status];
}

export function formatWorkflowTemplateDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
