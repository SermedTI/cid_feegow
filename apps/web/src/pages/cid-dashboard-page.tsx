import { useDeferredValue, useEffect, useState } from "react";
import { toast } from "sonner";

import type { CidDashboardFilters, CidDashboardSummary, CompanyCidListItem } from "@andre/shared";

import { CidFilterBar } from "@/components/app/cid-filter-bar";
import { CompanyCidTable } from "@/components/app/company-cid-table";
import { StatusCard } from "@/components/app/status-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/http";

const DEFAULT_FILTERS: CidDashboardFilters = {
  page: 1,
  pageSize: 20,
  sort: "diagnosticos",
  order: "desc",
};

export function CidDashboardPage() {
  const { token } = useAuth();
  const [filters, setFilters] = useState<CidDashboardFilters>(DEFAULT_FILTERS);
  const deferredFilters = useDeferredValue(filters);
  const [summary, setSummary] = useState<CidDashboardSummary | null>(null);
  const [rows, setRows] = useState<CompanyCidListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;
    setLoading(true);
    setSummary(null);
    setRows([]);

    Promise.all([api.getCidSummary(deferredFilters, token), api.getCompanyCidRows(deferredFilters, token)])
      .then(([summaryResult, tableResult]) => {
        if (!active) {
          return;
        }

        setSummary(summaryResult);
        setRows(tableResult.data);
      })
      .catch((error) => {
        if (active) {
          toast.error(error instanceof Error ? error.message : "Falha ao carregar o dashboard de CID.");
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

  async function handleExport() {
    if (!token) {
      return;
    }

    try {
      await api.downloadCidReport(deferredFilters, token);
      toast.success("PDF Empresa x CID gerado com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao gerar PDF Empresa x CID.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <CidFilterBar filters={filters} onChange={setFilters} onReset={() => setFilters(DEFAULT_FILTERS)} />

      <div className="text-sm text-muted-foreground">
        {loading ? (
          <Skeleton className="h-5 w-96" />
        ) : summary ? (
          <p>
            {summary.totalDiagnosticos.toLocaleString("pt-BR")} diagnosticos
            {" · "}
            {summary.totalEmpresas.toLocaleString("pt-BR")} empresas
            {" · "}
            {summary.totalCids.toLocaleString("pt-BR")} CIDs
            {" · "}
            {summary.totalPacientes.toLocaleString("pt-BR")} pacientes
          </p>
        ) : null}
      </div>

      <CompanyCidTable rows={rows} loading={loading} onExport={handleExport} />

      {!loading && !summary ? (
        <StatusCard
          title="Dashboard indisponivel"
          description="Nao foi possivel montar o cruzamento empresa x CID com a resposta atual do backend."
        />
      ) : null}
    </div>
  );
}
