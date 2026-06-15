import { createBrowserRouter } from "react-router-dom";

import { OrganisationRequiredRoute } from "@/components/auth/organisation-required-route";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppLayout } from "@/components/layout/app-layout";
import { DashboardPage } from "@/pages/dashboard-page";
import { HomePage } from "@/pages/home-page";
import { NotFoundPage } from "@/pages/not-found-page";
import { OrganisationSetupPage } from "@/pages/organisation-setup-page";
import { RequestsPage } from "@/pages/requests-page";
import { SettingsPage } from "@/pages/settings-page";
import { WorkflowsPage } from "@/pages/workflows-page";

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
                path: "requests",
                element: <RequestsPage />,
              },
              {
                path: "settings",
                element: <SettingsPage />,
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
