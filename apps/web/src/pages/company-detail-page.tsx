import { ArrowLeft, Building2, SearchX, Users2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import type { CompanyDetailResponse } from "@andre/shared";

import { BeneficiaryTable } from "@/components/app/beneficiary-table";
import { MetricCard } from "@/components/app/metric-card";
import { StatusCard } from "@/components/app/status-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/http";

export function CompanyDetailPage() {
  const { empresaId = "" } = useParams();
  const { token } = useAuth();
  const [data, setData] = useState<CompanyDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !empresaId) {
      return;
    }

    let active = true;
    setLoading(true);

    api.getCompanyDetail(empresaId, { page: 1, pageSize: 25 }, token)
      .then((result) => {
        if (active) {
          setData(result);
        }
      })
      .catch((error) => {
        if (active) {
          toast.error(error instanceof Error ? error.message : "Falha ao carregar a empresa.");
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
  }, [empresaId, token]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-2xl" />
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-72 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <StatusCard
        title="Empresa nao encontrada"
        description="O identificador informado nao retornou dados no backend."
        icon={SearchX}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button asChild variant="ghost" className="mb-2 px-0">
            <Link to="/">
              <ArrowLeft data-icon="inline-start" />
              Voltar ao dashboard
            </Link>
          </Button>
          <h2 className="text-2xl font-semibold">{data.summary.nome}</h2>
          <p className="text-sm text-muted-foreground">Empresa #{data.summary.empresaId}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Beneficiarios" value={data.summary.totalBeneficiarios} description="Total de beneficiarios ligados a esta empresa." icon={Users2} />
        <MetricCard title="Titulares" value={data.summary.totalTitulares} description="Contagem de titulares distintos no recorte atual." icon={Building2} />
        <MetricCard title="Dependentes" value={data.summary.totalDependentes} description="Dependentes relacionados aos titulares da empresa." icon={Users2} />
      </div>

      <BeneficiaryTable rows={data.beneficiaries.data} title="Beneficiarios da empresa" description="Amostra paginada retornada pelo endpoint analitico da empresa." />
    </div>
  );
}
