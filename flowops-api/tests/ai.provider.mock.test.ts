import { mockAiProvider } from "../src/modules/ai/ai.provider.mock";

describe("MockAiProvider", () => {
  it("returns an equipment workflow suggestion for equipment prompts", async () => {
    const suggestion = await mockAiProvider.generateWorkflowSuggestion({
      prompt: "Create an equipment request workflow for laptops and monitors.",
    });

    expect(suggestion.name).toBe("Equipment Request");
    expect(suggestion.fields.some((field) => field.fieldKey === "urgency")).toBe(
      true,
    );
    expect(suggestion.steps).toHaveLength(2);
  });

  it("returns a generic workflow suggestion for other prompts", async () => {
    const suggestion = await mockAiProvider.generateWorkflowSuggestion({
      prompt: "Create a simple onboarding checklist workflow for new hires.",
    });

    expect(suggestion.name).toBe("Suggested Workflow");
    expect(suggestion.fields.length).toBeGreaterThan(0);
    expect(suggestion.steps.length).toBeGreaterThan(0);
  });

  it("returns a readable request summary from structured context", async () => {
    const summary = await mockAiProvider.generateRequestSummary({
      context: [
        "Workflow: Equipment Request",
        "Request title: New laptop",
        "Status: Pending",
        "Requester: Ebube Nwadiokwu (ebube@flowops.local)",
        "Current step: Manager Approval (step 1 of 2)",
        "",
        "Submitted values:",
        "- Item requested: MacBook Pro",
      ].join("\n"),
    });

    expect(summary.length).toBeGreaterThanOrEqual(20);
    expect(summary.toLowerCase()).toContain("equipment request");
  });
});
