import {
  ArrowLeft,
  Building2,
  ChevronRight,
  FileBarChart2,
  Stethoscope,
  Users2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type {
  CidCompanyDrillResponse,
  CidExplorerCidRow,
  CidExplorerCompanyRow,
  CompanyCidDrillResponse,
} from "@andre/shared";

import { MetricCard } from "@/components/app/metric-card";
import { StatusCard } from "@/components/app/status-card";
import { CidCompanyDrillChart } from "@/components/charts/cid-company-drill-chart";
import { CompanyCidDrillChart } from "@/components/charts/company-cid-drill-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/http";
import { formatDateTime, formatInteger } from "@/lib/utils";

type DrillState =
  | { type: "none" }
  | { type: "company"; empresaId: number; loading: boolean; data: CompanyCidDrillResponse | null }
  | { type: "cid"; codigo: string; loading: boolean; data: CidCompanyDrillResponse | null };

export function CidExplorerPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState("companies");
  const [companies, setCompanies] = useState<CidExplorerCompanyRow[]>([]);
  const [cids, setCids] = useState<CidExplorerCidRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState<DrillState>({ type: "none" });

  useEffect(() => {
    if (!token) return;

    let active = true;
    setLoading(true);

    Promise.all([api.getExplorerCompanies(token), api.getExplorerCids(token)])
      .then(([companiesResult, cidsResult]) => {
        if (!active) return;
        setCompanies(companiesResult);
        setCids(cidsResult);
      })
      .catch((error) => {
        if (active) toast.error(error instanceof Error ? error.message : "Falha ao carregar explorer.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [token]);

  const drillIntoCompany = useCallback(
    async (empresaId: number) => {
      if (!token) return;
      setDrill({ type: "company", empresaId, loading: true, data: null });
      try {
        const data = await api.getCompanyCidDrill(empresaId, token);
        setDrill({ type: "company", empresaId, loading: false, data });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao carregar CIDs da empresa.");
        setDrill({ type: "none" });
      }
    },
    [token],
  );

  const drillIntoCid = useCallback(
    async (codigo: string) => {
      if (!token) return;
      setDrill({ type: "cid", codigo, loading: true, data: null });
      try {
        const data = await api.getCidCompanyDrill(codigo, token);
        setDrill({ type: "cid", codigo, loading: false, data });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao carregar empresas do CID.");
        setDrill({ type: "none" });
      }
    },
    [token],
  );

  const closeDrill = useCallback(() => setDrill({ type: "none" }), []);

  // --- Drill panel for a selected company ---
  if (drill.type === "company") {
    return (
      <CompanyDrillPanel
        drill={drill}
        onClose={closeDrill}
        onCidClick={drillIntoCid}
      />
    );
  }

  // --- Drill panel for a selected CID ---
  if (drill.type === "cid") {
    return (
      <CidDrillPanel
        drill={drill}
        onClose={closeDrill}
        onCompanyClick={drillIntoCompany}
      />
    );
  }

  // --- Main explorer view ---
  const maxCompanyDiag = companies[0]?.totalDiagnosticos ?? 1;
  const maxCidDiag = cids[0]?.totalDiagnosticos ?? 1;

  return (
    <div className="flex flex-col gap-6">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="companies">
            <Building2 className="size-4" />
            Por empresa
          </TabsTrigger>
          <TabsTrigger value="cids">
            <Stethoscope className="size-4" />
            Por CID
          </TabsTrigger>
        </TabsList>

        <TabsContent value="companies">
          <Card>
            <CardHeader>
              <CardTitle>Empresas com diagnosticos vinculados</CardTitle>
              <CardDescription>
                Clique em uma empresa para ver quais CIDs sao mais presentes. Ranking por volume de diagnosticos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingSkeleton />
              ) : !companies.length ? (
                <StatusCard
                  title="Sem dados"
                  description="Nenhuma empresa com diagnosticos vinculados foi encontrada."
                  className="border-0 shadow-none"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[280px]">Empresa</TableHead>
                      <TableHead>Diagnosticos</TableHead>
                      <TableHead className="hidden md:table-cell">CIDs distintos</TableHead>
                      <TableHead className="hidden md:table-cell">Pacientes</TableHead>
                      <TableHead className="w-[200px] hidden lg:table-cell">Concentracao</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => (
                      <TableRow
                        key={company.empresaId}
                        className="cursor-pointer"
                        onClick={() => void drillIntoCompany(company.empresaId)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Building2 className="size-4" />
                            </div>
                            <div>
                              <p className="font-medium leading-tight">{company.empresaNome}</p>
                              <p className="text-xs text-muted-foreground">ID {company.empresaId}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold tabular-nums">
                          {formatInteger(company.totalDiagnosticos)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="secondary">{company.totalCidsDistintos}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell tabular-nums">
                          {formatInteger(company.totalPacientes)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Progress value={company.totalDiagnosticos} max={maxCompanyDiag} />
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cids">
          <Card>
            <CardHeader>
              <CardTitle>CIDs com maior incidencia</CardTitle>
              <CardDescription>
                Clique em um CID para ver quais empresas possuem maior numero de diagnosticos com esse codigo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingSkeleton />
              ) : !cids.length ? (
                <StatusCard
                  title="Sem dados"
                  description="Nenhum CID vinculado foi encontrado."
                  className="border-0 shadow-none"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">CID</TableHead>
                      <TableHead>Descricao</TableHead>
                      <TableHead>Diagnosticos</TableHead>
                      <TableHead className="hidden md:table-cell">Empresas</TableHead>
                      <TableHead className="hidden md:table-cell">Pacientes</TableHead>
                      <TableHead className="w-[200px] hidden lg:table-cell">Concentracao</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cids.map((cid) => (
                      <TableRow
                        key={cid.codigo}
                        className="cursor-pointer"
                        onClick={() => void drillIntoCid(cid.codigo)}
                      >
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {cid.codigo}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="max-w-xs truncate">{cid.descricao}</p>
                        </TableCell>
                        <TableCell className="font-semibold tabular-nums">
                          {formatInteger(cid.totalDiagnosticos)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="secondary">{cid.totalEmpresas}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell tabular-nums">
                          {formatInteger(cid.totalPacientes)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Progress value={cid.totalDiagnosticos} max={maxCidDiag} />
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- Sub-components ---

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function CompanyDrillPanel({
  drill,
  onClose,
  onCidClick,
}: {
  drill: Extract<DrillState, { type: "company" }>;
  onClose: () => void;
  onCidClick: (codigo: string) => void;
}) {
  if (drill.loading || !drill.data) {
    return (
      <div className="flex flex-col gap-6">
        <Button variant="ghost" className="w-fit px-0" onClick={onClose}>
          <ArrowLeft className="size-4" /> Voltar ao explorer
        </Button>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  const { data } = drill;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" className="mb-2 px-0" onClick={onClose}>
          <ArrowLeft className="size-4" /> Voltar ao explorer
        </Button>
        <h2 className="text-2xl font-semibold">{data.empresaNome}</h2>
        <p className="text-sm text-muted-foreground">Empresa #{data.empresaId} — Diagnosticos vinculados por CID</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Diagnosticos" value={data.totalDiagnosticos} description="Total de diagnosticos vinculados a esta empresa." icon={FileBarChart2} />
        <MetricCard title="CIDs distintos" value={data.totalCidsDistintos} description="Codigos CID unicos encontrados nos diagnosticos." icon={Stethoscope} />
        <MetricCard title="Pacientes" value={data.totalPacientes} description="Pacientes distintos com diagnosticos nesta empresa." icon={Users2} />
      </div>

      <CompanyCidDrillChart empresaNome={data.empresaNome} data={data.cids} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Todos os CIDs desta empresa</CardTitle>
          <CardDescription>Clique em um CID para ver quais outras empresas tambem o possuem.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CID</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead>Diagnosticos</TableHead>
                <TableHead>Pacientes</TableHead>
                <TableHead className="hidden md:table-cell">Ultimo diagnostico</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.cids.map((cid) => (
                <TableRow
                  key={cid.codigo}
                  className="cursor-pointer"
                  onClick={() => onCidClick(cid.codigo)}
                >
                  <TableCell>
                    <Badge variant="outline" className="font-mono">{cid.codigo}</Badge>
                  </TableCell>
                  <TableCell>
                    <p className="max-w-xs truncate">{cid.descricao}</p>
                  </TableCell>
                  <TableCell className="font-semibold tabular-nums">{formatInteger(cid.totalDiagnosticos)}</TableCell>
                  <TableCell className="tabular-nums">{formatInteger(cid.totalPacientes)}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{formatDateTime(cid.lastDiagnosisAt)}</TableCell>
                  <TableCell>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function CidDrillPanel({
  drill,
  onClose,
  onCompanyClick,
}: {
  drill: Extract<DrillState, { type: "cid" }>;
  onClose: () => void;
  onCompanyClick: (empresaId: number) => void;
}) {
  if (drill.loading || !drill.data) {
    return (
      <div className="flex flex-col gap-6">
        <Button variant="ghost" className="w-fit px-0" onClick={onClose}>
          <ArrowLeft className="size-4" /> Voltar ao explorer
        </Button>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  const { data } = drill;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" className="mb-2 px-0" onClick={onClose}>
          <ArrowLeft className="size-4" /> Voltar ao explorer
        </Button>
        <div className="flex items-center gap-3">
          <Badge className="text-lg font-mono px-3 py-1">{data.codigo}</Badge>
          <h2 className="text-2xl font-semibold">{data.descricao}</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Empresas com diagnosticos deste CID</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Diagnosticos" value={data.totalDiagnosticos} description="Total de diagnosticos com este CID em todas empresas." icon={FileBarChart2} />
        <MetricCard title="Empresas" value={data.totalEmpresas} description="Empresas que possuem ao menos um diagnostico com este CID." icon={Building2} />
        <MetricCard title="Pacientes" value={data.totalPacientes} description="Pacientes distintos diagnosticados com este CID." icon={Users2} />
      </div>

      <CidCompanyDrillChart codigo={data.codigo} descricao={data.descricao} data={data.empresas} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Empresas com {data.codigo}</CardTitle>
          <CardDescription>Clique em uma empresa para ver todos os CIDs dela.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Diagnosticos</TableHead>
                <TableHead>Pacientes</TableHead>
                <TableHead className="hidden md:table-cell">Ultimo diagnostico</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.empresas.map((empresa) => (
                <TableRow
                  key={empresa.empresaId}
                  className="cursor-pointer"
                  onClick={() => onCompanyClick(empresa.empresaId)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Building2 className="size-4" />
                      </div>
                      <div>
                        <p className="font-medium leading-tight">{empresa.empresaNome}</p>
                        <p className="text-xs text-muted-foreground">ID {empresa.empresaId}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold tabular-nums">{formatInteger(empresa.totalDiagnosticos)}</TableCell>
                  <TableCell className="tabular-nums">{formatInteger(empresa.totalPacientes)}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{formatDateTime(empresa.lastDiagnosisAt)}</TableCell>
                  <TableCell>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
