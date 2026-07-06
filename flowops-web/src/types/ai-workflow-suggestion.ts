import type { CreateWorkflowTemplateFormValues } from "@/schemas/workflow-template.schema";
import type { WorkflowFieldType } from "@/types/workflow-template";

export interface GeneratedWorkflowFieldSuggestion {
  label: string;
  fieldKey: string;
  fieldType: WorkflowFieldType;
  helpText?: string;
  placeholder?: string;
  isRequired: boolean;
  options?: string[];
  fieldOrder: number;
}

export interface GeneratedWorkflowStepSuggestion {
  name: string;
  description?: string;
  stepOrder: number;
  suggestedApproverRole?: string;
}

export interface GeneratedWorkflowSuggestion {
  name: string;
  description?: string;
  category?: string;
  fields: GeneratedWorkflowFieldSuggestion[];
  steps: GeneratedWorkflowStepSuggestion[];
}

export interface CreateWorkflowFromAiLocationState {
  fromAi: true;
  initialValues: CreateWorkflowTemplateFormValues;
  key: number;
}
