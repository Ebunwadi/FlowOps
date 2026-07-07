function escapeCsvValue(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function formatExportDate(value: string | null): string {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString();
}

export function buildRequestsCsvContent(
  rows: Array<{
    id: string;
    title: string | null;
    workflowName: string;
    requesterName: string;
    status: string;
    currentStepName: string | null;
    submittedAt: string | null;
    completedAt: string | null;
    updatedAt: string;
  }>,
): string {
  const headers = [
    "Request ID",
    "Title",
    "Workflow",
    "Requester",
    "Status",
    "Current step",
    "Submitted date",
    "Completed date",
    "Last updated",
  ];

  const lines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) =>
      [
        row.id,
        row.title ?? "",
        row.workflowName,
        row.requesterName,
        row.status,
        row.currentStepName ?? "",
        formatExportDate(row.submittedAt),
        formatExportDate(row.completedAt),
        formatExportDate(row.updatedAt),
      ]
        .map(escapeCsvValue)
        .join(","),
    ),
  ];

  return `${lines.join("\r\n")}\r\n`;
}
