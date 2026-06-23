import { createBrowserRouter } from "react-router-dom";

import { OrganisationRequiredRoute } from "@/components/auth/organisation-required-route";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppLayout } from "@/components/layout/app-layout";
import { AuditLogsPage } from "@/pages/audit-logs-page";
import { AvailableWorkflowsPage } from "@/pages/available-workflows-page";
import { DashboardPage } from "@/pages/dashboard-page";
import { HomePage } from "@/pages/home-page";
import { NotFoundPage } from "@/pages/not-found-page";
import { OrganisationMembersPage } from "@/pages/organisation-members-page";
import { OrganisationSetupPage } from "@/pages/organisation-setup-page";
import { RequestsPage } from "@/pages/requests-page";
import { SubmitRequestPage } from "@/pages/submit-request-page";
import { SettingsPage } from "@/pages/settings-page";
import { WorkflowsPage } from "@/pages/workflows-page";
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
                path: "requests/start",
                element: <AvailableWorkflowsPage />,
              },
              {
                path: "requests/start/:workflowTemplateId",
                element: <SubmitRequestPage />,
              },
              {
                path: "settings",
                element: <SettingsPage />,
              },
              {
                path: "audit-logs",
                element: <AuditLogsPage />,
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
