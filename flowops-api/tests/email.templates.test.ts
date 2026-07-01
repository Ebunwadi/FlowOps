import {
  renderEmailTemplate,
  resolvePublicActionUrl,
} from "../src/modules/email/email.templates";
import { EMAIL_TEMPLATE_NAMES } from "../src/modules/email/email.types";

describe("email templates", () => {
  it("renders approval required template with absolute action url", () => {
    const rendered = renderEmailTemplate(EMAIL_TEMPLATE_NAMES.APPROVAL_REQUIRED, {
      recipientName: "Alex",
      requestTitle: "New laptop",
      workflowName: "IT procurement",
      actionUrl: "/approvals/req-1",
    });

    expect(rendered.subject).toBe("Approval required");
    expect(rendered.text).toContain("Hi Alex");
    expect(rendered.text).toContain("New laptop");
    expect(rendered.text).toContain("http://localhost:5173/approvals/req-1");
    expect(rendered.html).toContain("Open in FlowOps");
  });

  it("keeps absolute action urls unchanged", () => {
    expect(resolvePublicActionUrl("https://app.flowops.test/requests/1")).toBe(
      "https://app.flowops.test/requests/1",
    );
  });

  it("renders rejected template with comment", () => {
    const rendered = renderEmailTemplate(EMAIL_TEMPLATE_NAMES.REQUEST_REJECTED, {
      recipientName: "Sam",
      requestTitle: "Travel request",
      comment: "Budget exceeded",
      actionUrl: "/requests/req-2",
    });

    expect(rendered.subject).toBe("Request rejected");
    expect(rendered.text).toContain("Budget exceeded");
  });

  it("throws for unknown templates", () => {
    expect(() => renderEmailTemplate("UNKNOWN", {})).toThrow(
      "Unknown email template: UNKNOWN",
    );
  });
});
