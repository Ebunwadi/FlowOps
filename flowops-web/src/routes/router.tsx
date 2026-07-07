import { createBrowserRouter } from "react-router-dom";

import { OrganisationRequiredRoute } from "@/components/auth/organisation-required-route";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppLayout } from "@/components/layout/app-layout";
import { ApprovalReviewPage } from "@/pages/approval-review-page";
import { ApprovalsPage } from "@/pages/approvals-page";
import { AuditLogsPage } from "@/pages/audit-logs-page";
import { AvailableWorkflowsPage } from "@/pages/available-workflows-page";
import { DashboardPage } from "@/pages/dashboard-page";
import { HomePage } from "@/pages/home-page";
import { NotFoundPage } from "@/pages/not-found-page";
import { NotificationsPage } from "@/pages/notifications-page";
import { OrganisationMembersPage } from "@/pages/organisation-members-page";
import { OrganisationSetupPage } from "@/pages/organisation-setup-page";
import { EditDraftRequestPage } from "@/pages/edit-draft-request-page";
import { RequestDetailPage } from "@/pages/request-detail-page";
import { ReportsPage } from "@/pages/reports-page";
import { RequestsPage } from "@/pages/requests-page";
import { SubmitRequestPage } from "@/pages/submit-request-page";
import { ApiKeysSettingsPage } from "@/pages/api-keys-settings-page";
import { DelegationSettingsPage } from "@/pages/delegation-settings-page";
import { OutOfOfficeSettingsPage } from "@/pages/out-of-office-settings-page";
import { WebhooksSettingsPage } from "@/pages/webhooks-settings-page";
import { OrganisationSettingsPage } from "@/pages/organisation-settings-page";
import { SettingsPage } from "@/pages/settings-page";
import { WorkflowsPage } from "@/pages/workflows-page";
import { AiGenerateWorkflowPage } from "@/pages/ai-generate-workflow-page";
import { CreateWorkflowTemplatePage } from "@/pages/create-workflow-template-page";
import { EditWorkflowTemplatePage } from "@/pages/edit-workflow-template-page";
import { WorkflowTemplateDetailPage } from "@/pages/workflow-template-detail-page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "organisation/setup",
            element: <OrganisationSetupPage />,
          },
          {
            element: <OrganisationRequiredRoute />,
            children: [
              {
                path: "dashboard",
                element: <DashboardPage />,
              },
              {
                path: "workflows",
                element: <WorkflowsPage />,
              },
              {
                path: "workflows/new",
                element: <CreateWorkflowTemplatePage />,
              },
              {
                path: "workflows/ai-generate",
                element: <AiGenerateWorkflowPage />,
              },
              {
                path: "workflows/:id/edit",
                element: <EditWorkflowTemplatePage />,
              },
              {
                path: "workflows/:id",
                element: <WorkflowTemplateDetailPage />,
              },
              {
                path: "requests",
                element: <RequestsPage />,
              },
              {
                path: "approvals",
                element: <ApprovalsPage />,
              },
              {
                path: "approvals/:requestId",
                element: <ApprovalReviewPage />,
              },
              {
                path: "requests/start",
                element: <AvailableWorkflowsPage />,
              },
              {
                path: "requests/start/:workflowTemplateId",
                element: <SubmitRequestPage />,
              },
              {
                path: "requests/:id",
                element: <RequestDetailPage />,
              },
              {
                path: "requests/:id/edit",
                element: <EditDraftRequestPage />,
              },
              {
                path: "notifications",
                element: <NotificationsPage />,
              },
              {
                path: "settings",
                element: <SettingsPage />,
              },
              {
                path: "settings/organisation",
                element: <OrganisationSettingsPage />,
              },
              {
                path: "settings/api-keys",
                element: <ApiKeysSettingsPage />,
              },
              {
                path: "settings/webhooks",
                element: <WebhooksSettingsPage />,
              },
              {
                path: "settings/delegation",
                element: <DelegationSettingsPage />,
              },
              {
                path: "settings/out-of-office",
                element: <OutOfOfficeSettingsPage />,
              },
              {
                path: "audit-logs",
                element: <AuditLogsPage />,
              },
              {
                path: "reports",
                element: <ReportsPage />,
              },
              {
                path: "organisation/members",
                element: <OrganisationMembersPage />,
              },
            ],
          },
        ],
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);
