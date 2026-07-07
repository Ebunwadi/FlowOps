import PDFDocument from "pdfkit";

import type { ReportPdfExportInput } from "./reports.export.types";

function formatDisplayDate(value: Date | string | null): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

export function buildRequestsPdfBuffer(input: ReportPdfExportInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on("error", reject);

    doc.fontSize(20).text("Workflow Requests Report", { align: "left" });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor("#444444");
    doc.text(`Organisation: ${input.organisationName}`);
    doc.text(`Report date: ${formatDisplayDate(input.generatedAt)}`);
    doc.moveDown();

    doc.fillColor("#000000").fontSize(14).text("Summary metrics");
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Total requests: ${input.summary.totalRequests}`);
    doc.text(`Pending requests: ${input.summary.pendingRequests}`);
    doc.text(`Completed requests: ${input.summary.completedRequests}`);
    doc.text(`Rejected requests: ${input.summary.rejectedRequests}`);
    doc.text(`Overdue requests: ${input.summary.overdueRequests}`);
    doc.text(
      `Average approval time (hours): ${
        input.summary.averageApprovalTimeHours ?? "—"
      }`,
    );
    doc.moveDown();

    doc.fontSize(14).text("Request table");
    doc.moveDown(0.5);

    if (input.rows.length === 0) {
      doc.fontSize(11).text("No submitted requests match the selected filters.");
      doc.end();
      return;
    }

    doc.fontSize(9);

    for (const row of input.rows) {
      if (doc.y > doc.page.height - 120) {
        doc.addPage();
      }

      doc
        .font("Helvetica-Bold")
        .text(truncateText(row.title ?? "Untitled request", 80));
      doc.font("Helvetica");
      doc.text(`ID: ${row.id}`);
      doc.text(`Workflow: ${row.workflowName}`);
      doc.text(`Requester: ${row.requesterName}`);
      doc.text(`Status: ${row.status}`);
      doc.text(`Current step: ${row.currentStepName ?? "—"}`);
      doc.text(`Submitted: ${formatDisplayDate(row.submittedAt)}`);
      doc.text(`Completed: ${formatDisplayDate(row.completedAt)}`);
      doc.text(`Last updated: ${formatDisplayDate(row.updatedAt)}`);
      doc.moveDown(0.75);
    }

    doc.end();
  });
}
