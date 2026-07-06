import { generatedWorkflowSuggestionSchema } from "../src/modules/ai/ai.validation";

describe("generatedWorkflowSuggestionSchema", () => {
  it("accepts a valid AI workflow suggestion shape", () => {
    const result = generatedWorkflowSuggestionSchema.parse({
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
      ],
      steps: [
        {
          name: "Manager Approval",
          stepOrder: 1,
          suggestedApproverRole: "Manager",
        },
      ],
    });

    expect(result.name).toBe("Equipment Request");
  });

  it("rejects suggestions without approval steps", () => {
    expect(() =>
      generatedWorkflowSuggestionSchema.parse({
        name: "Broken Workflow",
        fields: [
          {
            label: "Title",
            fieldKey: "title",
            fieldType: "SHORT_TEXT",
            isRequired: true,
            fieldOrder: 1,
          },
        ],
        steps: [],
      }),
    ).toThrow();
  });
});
