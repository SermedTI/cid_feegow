import { Download } from "lucide-react";

import type { CompanyCidListItem } from "@andre/shared";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatInteger } from "@/lib/utils";

interface CompanyCidTableProps {
  rows: CompanyCidListItem[];
  loading?: boolean;
  onExport: () => void;
}

export function CompanyCidTable({ rows, loading, onExport }: CompanyCidTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Matriz empresa x CID</CardTitle>
          <CardDescription>
            Agrupamento por empresa e codigo CID usando o vinculo entre `PacienteID` e `matricula_pep`.
          </CardDescription>
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
              <TableHead>CID</TableHead>
              <TableHead>Descricao</TableHead>
              <TableHead>Diagnosticos</TableHead>
              <TableHead>Pacientes</TableHead>
              <TableHead>Ultimo diagnostico</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={`cid-loading-${index}`}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : null}
            {rows.map((row) => (
              <TableRow key={`${row.empresaId}-${row.codigo}`}>
                <TableCell className="font-medium">{row.empresaNome}</TableCell>
                <TableCell>{row.codigo}</TableCell>
                <TableCell>{row.descricao}</TableCell>
                <TableCell>{formatInteger(row.totalDiagnosticos)}</TableCell>
                <TableCell>{formatInteger(row.totalPacientes)}</TableCell>
                <TableCell>{formatDateTime(row.lastDiagnosisAt)}</TableCell>
              </TableRow>
            ))}
            {!loading && !rows.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhuma combinacao empresa x CID encontrada para os filtros atuais.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
