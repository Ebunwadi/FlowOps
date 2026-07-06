import type { GeneratedWorkflowSuggestion } from "./ai.validation";
import { extractSummaryContextField } from "./ai.request-summary.context";
import type {
  AiProvider,
  GenerateRequestSummaryInput,
  GenerateWorkflowSuggestionInput,
} from "./ai.provider.types";

function slugifyFieldKey(label: string): string {
  const normalized = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  if (!normalized) {
    return "field";
  }

  return /^[a-z]/.test(normalized) ? normalized : `field_${normalized}`;
}

function buildEquipmentRequestSuggestion(): GeneratedWorkflowSuggestion {
  return {
    name: "Equipment Request",
    description: "Used by staff to request work equipment.",
    category: "IT",
    fields: [
      {
        label: "Item requested",
        fieldKey: "item_requested",
        fieldType: "SHORT_TEXT",
        isRequired: true,
        fieldOrder: 1,
      },
      {
        label: "Reason",
        fieldKey: "reason",
        fieldType: "LONG_TEXT",
        isRequired: true,
        fieldOrder: 2,
      },
      {
        label: "Urgency",
        fieldKey: "urgency",
        fieldType: "DROPDOWN",
        options: ["Low", "Medium", "High"],
        isRequired: true,
        fieldOrder: 3,
      },
    ],
    steps: [
      {
        name: "Manager Approval",
        stepOrder: 1,
        suggestedApproverRole: "Manager",
      },
      {
        name: "IT Approval",
        stepOrder: 2,
        suggestedApproverRole: "Admin",
      },
    ],
  };
}

function buildLeaveRequestSuggestion(): GeneratedWorkflowSuggestion {
  return {
    name: "Leave Request",
    description: "Submit and track time-off requests.",
    category: "HR",
    fields: [
      {
        label: "Leave type",
        fieldKey: "leave_type",
        fieldType: "DROPDOWN",
        options: ["Annual leave", "Sick leave", "Unpaid leave"],
        isRequired: true,
        fieldOrder: 1,
      },
      {
        label: "Start date",
        fieldKey: "start_date",
        fieldType: "DATE",
        isRequired: true,
        fieldOrder: 2,
      },
      {
        label: "End date",
        fieldKey: "end_date",
        fieldType: "DATE",
        isRequired: true,
        fieldOrder: 3,
      },
      {
        label: "Reason",
        fieldKey: "reason",
        fieldType: "LONG_TEXT",
        isRequired: false,
        fieldOrder: 4,
      },
    ],
    steps: [
      {
        name: "Manager Approval",
        stepOrder: 1,
        suggestedApproverRole: "Manager",
      },
      {
        name: "HR Approval",
        stepOrder: 2,
        suggestedApproverRole: "Admin",
      },
    ],
  };
}

function buildGenericSuggestion(prompt: string): GeneratedWorkflowSuggestion {
  const trimmedPrompt = prompt.trim();
  const summary =
    trimmedPrompt.length > 120 ? `${trimmedPrompt.slice(0, 117)}...` : trimmedPrompt;

  return {
    name: "Suggested Workflow",
    description: summary,
    category: "General",
    fields: [
      {
        label: "Request title",
        fieldKey: "request_title",
        fieldType: "SHORT_TEXT",
        isRequired: true,
        fieldOrder: 1,
      },
      {
        label: "Details",
        fieldKey: slugifyFieldKey("details"),
        fieldType: "LONG_TEXT",
        isRequired: true,
        fieldOrder: 2,
      },
    ],
    steps: [
      {
        name: "Manager Approval",
        stepOrder: 1,
        suggestedApproverRole: "Manager",
      },
    ],
  };
}

export class MockAiProvider implements AiProvider {
  async generateWorkflowSuggestion(
    input: GenerateWorkflowSuggestionInput,
  ): Promise<GeneratedWorkflowSuggestion> {
    const normalizedPrompt = input.prompt.toLowerCase();

    if (
      /equipment|laptop|device|hardware|it request/.test(normalizedPrompt)
    ) {
      return buildEquipmentRequestSuggestion();
    }

    if (/leave|time off|vacation|holiday|pto/.test(normalizedPrompt)) {
      return buildLeaveRequestSuggestion();
    }

    return buildGenericSuggestion(input.prompt);
  }

  async generateRequestSummary(
    input: GenerateRequestSummaryInput,
  ): Promise<string> {
    const workflow =
      extractSummaryContextField(input.context, "Workflow") ?? "workflow request";
    const requestTitle =
      extractSummaryContextField(input.context, "Request title") ??
      "this request";
    const status =
      extractSummaryContextField(input.context, "Status") ?? "In progress";
    const requester =
      extractSummaryContextField(input.context, "Requester") ?? "the requester";
    const currentStep =
      extractSummaryContextField(input.context, "Current step") ?? "None";

    const valueLines = input.context
      .split("\n")
      .filter((line) => line.startsWith("- ") && !line.includes("Step "))
      .slice(0, 3)
      .map((line) => line.replace(/^- /, ""))
      .join("; ");

    const progressSentence =
      currentStep === "None"
        ? `The request is currently ${status.toLowerCase()}.`
        : `The request is currently ${status.toLowerCase()} and waiting at ${currentStep}.`;

    const valuesSentence = valueLines
      ? ` Key details include ${valueLines}.`
      : "";

    return `This ${workflow.toLowerCase()} titled "${requestTitle}" was submitted by ${requester.split(" (")[0]}.${valuesSentence} ${progressSentence}`.trim();
  }
}

export const mockAiProvider = new MockAiProvider();
