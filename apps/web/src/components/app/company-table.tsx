import { ArrowRight, Download } from "lucide-react";
import { Link } from "react-router-dom";

import type { DashboardCompanyListItem } from "@andre/shared";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatInteger, formatPercent } from "@/lib/utils";

interface CompanyTableProps {
  rows: DashboardCompanyListItem[];
  loading?: boolean;
  onExport: () => void;
}

export function CompanyTable({ rows, loading, onExport }: CompanyTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Empresas monitoradas</CardTitle>
          <CardDescription>Tabela analitica com acesso ao drilldown da empresa.</CardDescription>
        </div>
        <Button variant="outline" onClick={onExport} disabled={loading || !rows.length}>
          <Download data-icon="inline-start" />
          Exportar PDF
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Beneficiarios</TableHead>
              <TableHead>Titulares</TableHead>
              <TableHead>Dependentes</TableHead>
              <TableHead>Cobertura titulares</TableHead>
              <TableHead className="text-right">Acao</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`loading-${index}`}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : null}
            {rows.map((row) => (
              <TableRow key={row.empresaId}>
                <TableCell className="font-medium">{row.nome}</TableCell>
                <TableCell>{formatInteger(row.totalBeneficiarios)}</TableCell>
                <TableCell>{formatInteger(row.totalTitulares)}</TableCell>
                <TableCell>{formatInteger(row.totalDependentes)}</TableCell>
                <TableCell>{formatPercent(row.coberturaTitularesPercent)}%</TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="ghost">
                    <Link to={`/companies/${row.empresaId}`}>
                      Ver detalhe
                      <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && !loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum registro encontrado para os filtros atuais.</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
