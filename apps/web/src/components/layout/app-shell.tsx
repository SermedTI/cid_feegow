import { BarChart3, Building2, FileBarChart2, LogOut, Search, ShieldCheck, Users } from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navigation = [
  { to: "/", label: "Dashboard", icon: BarChart3 },
  { to: "/cid-insights", label: "Relatorio CID", icon: FileBarChart2 },
  { to: "/cid-explorer", label: "Explorer CID", icon: Search },
  { to: "/users", label: "Usuarios", icon: Users, adminOnly: true },
];

function getHeaderCopy(pathname: string) {
  if (pathname === "/") {
    return {
      eyebrow: "Dashboard executivo",
      title: "Insights de beneficiarios",
    };
  }

  if (pathname.startsWith("/companies/")) {
    return {
      eyebrow: "Detalhe da empresa",
      title: "Drilldown de beneficiarios",
    };
  }

  if (pathname === "/cid-insights") {
    return {
      eyebrow: "Relatorio operacional",
      title: "Filtro e exportacao Empresa x CID",
    };
  }

  if (pathname === "/cid-explorer") {
    return {
      eyebrow: "Explorador interativo",
      title: "Explorer Empresa x CID",
    };
  }

  if (pathname === "/users") {
    return {
      eyebrow: "Administracao",
      title: "Gestao de usuarios",
    };
  }

  return {
    eyebrow: "Area autenticada",
    title: "Painel de analise",
  };
}

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const headerCopy = getHeaderCopy(location.pathname);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="border-r bg-card/70 px-5 py-6 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Building2 className="size-5" />
          </div>
          <div>
            <Link to="/" className="text-lg font-semibold">Beneficiarios</Link>
            <p className="text-sm text-muted-foreground">Analise por empresa</p>
          </div>
        </div>

        <Separator className="my-6" />

        <nav className="flex flex-col gap-2">
          {navigation.map((item) => {
            if (item.adminOnly && user?.role !== "admin") {
              return null;
            }

            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )
                }
              >
                <Icon />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-8 rounded-2xl border bg-background/80 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-primary" />
            <span className="text-sm font-medium">Controle de acesso</span>
          </div>
          <p className="mt-2 truncate text-sm text-muted-foreground" title={user?.email ?? ""}>Sessao atual: {user?.email}</p>
          <Badge variant="secondary" className="mt-3">{user?.role === "admin" ? "Administrador" : "Leitor"}</Badge>
        </div>
      </aside>

      <main className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 border-b bg-background/80 px-5 py-4 backdrop-blur-sm lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{headerCopy.eyebrow}</p>
              <h1 className="text-2xl font-semibold">{headerCopy.title}</h1>
            </div>
            <Button variant="outline" onClick={() => void logout()}>
              <LogOut data-icon="inline-start" />
              Sair
            </Button>
          </div>
        </header>
        <div className="flex-1 px-5 py-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
