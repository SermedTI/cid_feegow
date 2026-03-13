import type { BeneficiarioRow } from "@andre/shared";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatInteger } from "@/lib/utils";

interface BeneficiaryTableProps {
  rows: BeneficiarioRow[];
  title?: string;
  description?: string;
}

export function BeneficiaryTable({ rows, title = "Beneficiarios", description = "Detalhamento dos registros retornados pelo backend." }: BeneficiaryTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome do beneficiario</TableHead>
              <TableHead>Matricula</TableHead>
              <TableHead>Matricula PEP</TableHead>
              <TableHead>Titular</TableHead>
              <TableHead>Tipo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={`${row.empresa}-${row.matricula}-${row.matriculaPep ?? "null"}`}>
                <TableCell className="font-medium">{row.nome}</TableCell>
                <TableCell>{formatInteger(row.matricula)}</TableCell>
                <TableCell>{row.matriculaPep ? formatInteger(row.matriculaPep) : "-"}</TableCell>
                <TableCell>{row.titular ? formatInteger(row.titular) : "-"}</TableCell>
                <TableCell>
                  <Badge variant={row.isTitular ? "default" : "secondary"}>{row.isTitular ? "Titular" : "Dependente"}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">Sem beneficiarios para exibir.</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
