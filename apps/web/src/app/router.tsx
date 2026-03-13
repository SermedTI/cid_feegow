import { createBrowserRouter } from "react-router-dom";

import { ProtectedRoute } from "@/components/app/protected-route";
import { AppShell } from "@/components/layout/app-shell";
import { CidDashboardPage } from "@/pages/cid-dashboard-page";
import { CidExplorerPage } from "@/pages/cid-explorer-page";
import { CompanyDetailPage } from "@/pages/company-detail-page";
import { DashboardPage } from "@/pages/dashboard-page";
import { LoginPage } from "@/pages/login-page";
import { NotFoundPage } from "@/pages/not-found-page";
import { UsersPage } from "@/pages/users-page";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: "/",
            element: <DashboardPage />,
          },
          {
            path: "/companies/:empresaId",
            element: <CompanyDetailPage />,
          },
          {
            path: "/cid-insights",
            element: <CidDashboardPage />,
          },
          {
            path: "/cid-explorer",
            element: <CidExplorerPage />,
          },
          {
            path: "/users",
            element: <UsersPage />,
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
