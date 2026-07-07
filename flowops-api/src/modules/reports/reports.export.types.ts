export interface ReportExportRequestRow {
  id: string;
  title: string | null;
  workflowName: string;
  requesterName: string;
  status: string;
  currentStepName: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface ReportFileExport {
  fileName: string;
  content: Buffer;
  contentType: string;
}

export interface ReportCsvExportInput {
  organisationName: string;
  generatedAt: Date;
  rows: ReportExportRequestRow[];
}

export interface ReportPdfExportInput {
  organisationName: string;
  generatedAt: Date;
  summary: {
    totalRequests: number;
    pendingRequests: number;
    completedRequests: number;
    rejectedRequests: number;
    averageApprovalTimeHours: number | null;
    overdueRequests: number;
  };
  rows: ReportExportRequestRow[];
}
