import { Building2, ScanSearch, ShieldPlus, Users2 } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { DashboardCompanyListItem, DashboardFilters, DashboardSummary } from "@andre/shared";

import { CompanyTable } from "@/components/app/company-table";
import { FilterBar } from "@/components/app/filter-bar";
import { MetricCard } from "@/components/app/metric-card";
import { StatusCard } from "@/components/app/status-card";
import { DependencyChart } from "@/components/charts/dependency-chart";
import { TopCompaniesChart } from "@/components/charts/top-companies-chart";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/http";

const DEFAULT_FILTERS: DashboardFilters = {
  page: 1,
  pageSize: 12,
  sort: "beneficiarios",
  order: "desc",
};

export function DashboardPage() {
  const { token } = useAuth();
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const deferredFilters = useDeferredValue(filters);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [companies, setCompanies] = useState<DashboardCompanyListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;
    setLoading(true);
    setSummary(null);
    setCompanies([]);

    Promise.all([api.getSummary(deferredFilters, token), api.getCompanies(deferredFilters, token)])
      .then(([summaryResult, companiesResult]) => {
        if (!active) {
          return;
        }
        setSummary(summaryResult);
        setCompanies(companiesResult.data);
      })
      .catch((error) => {
        if (active) {
          toast.error(error instanceof Error ? error.message : "Falha ao carregar dashboard.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [deferredFilters, token]);

  const metrics = useMemo(() => {
    if (!summary) {
      return [];
    }

    return [
      { title: "Beneficiarios", value: summary.totalBeneficiarios, description: "Volume total da carteira retornada.", icon: Users2 },
      { title: "Empresas", value: summary.totalEmpresas, description: "Empresas distintas na base filtrada.", icon: Building2 },
      { title: "Titulares", value: summary.totalTitulares, description: "Registros classificados como titular.", icon: ShieldPlus },
      { title: "Dependentes", value: summary.totalDependentes, description: "Beneficiarios vinculados a um titular.", icon: ScanSearch },
    ];
  }, [summary]);

  async function handleExport() {
    if (!token) {
      return;
    }

    try {
      await api.downloadReport(deferredFilters, token);
      toast.success("PDF gerado com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao gerar PDF.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <FilterBar filters={filters} onChange={setFilters} onReset={() => setFilters(DEFAULT_FILTERS)} />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((item) => (
            <MetricCard key={item.title} {...item} />
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        {loading ? (
          <>
            <Card><CardContent className="p-6"><Skeleton className="h-72 w-full" /></CardContent></Card>
            <Card><CardContent className="p-6"><Skeleton className="h-72 w-full" /></CardContent></Card>
          </>
        ) : (
          <>
            <TopCompaniesChart data={companies.length ? companies : summary?.topEmpresas ?? []} />
            <DependencyChart titulares={summary?.totalTitulares ?? 0} dependentes={summary?.totalDependentes ?? 0} />
          </>
        )}
      </div>

      <CompanyTable rows={companies} loading={loading} onExport={handleExport} />

      {!loading && !summary ? (
        <StatusCard
          title="Dashboard indisponivel"
          description="Nao foi possivel montar os insights com a resposta atual do backend."
        />
      ) : null}
    </div>
  );
}
