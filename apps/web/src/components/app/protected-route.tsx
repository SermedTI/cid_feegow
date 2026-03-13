import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/lib/auth";

export function ProtectedRoute() {
  const { loading, token } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Carregando sessao...</div>;
  }

  if (!token) {
    return <Navigate replace to="/login" state={{ from: location }} />;
  }

  return <Outlet />;
}
