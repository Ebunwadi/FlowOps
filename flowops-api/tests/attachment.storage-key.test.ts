import {
  buildAttachmentStorageKey,
  buildAttachmentStoredFileName,
  sanitizeAttachmentFileName,
} from "../src/modules/attachments/attachment.storage-key";

describe("attachment storage key helpers", () => {
  it("sanitises unsafe file names for object storage", () => {
    expect(sanitizeAttachmentFileName("../../report final.pdf")).toBe(
      "report_final.pdf",
    );
  });

  it("builds stored file names with the attachment id prefix", () => {
    expect(
      buildAttachmentStoredFileName("attachment-id", "Quarterly Report.pdf"),
    ).toBe("attachment-id-Quarterly_Report.pdf");
  });

  it("builds organisation-scoped storage keys", () => {
    expect(
      buildAttachmentStorageKey({
        organisationId: "org-1",
        workflowRequestId: "req-1",
        storedFileName: "attachment-id-report.pdf",
      }),
    ).toBe(
      "organisations/org-1/requests/req-1/attachments/attachment-id-report.pdf",
    );
  });
});
