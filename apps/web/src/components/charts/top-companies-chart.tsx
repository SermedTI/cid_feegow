import type { DashboardCompanyListItem, TopCompanyItem } from "@andre/shared";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { StatusCard } from "@/components/app/status-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInteger } from "@/lib/utils";

type ChartRow = Pick<DashboardCompanyListItem, "nome" | "totalBeneficiarios"> | Pick<TopCompanyItem, "nome" | "totalBeneficiarios">;

interface TopCompaniesChartProps {
  data: ChartRow[];
}

export function TopCompaniesChart({ data }: TopCompaniesChartProps) {
  if (!data.length) {
    return (
      <StatusCard
        title="Top empresas"
        description="Nenhuma empresa corresponde aos filtros atuais."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top empresas</CardTitle>
        <CardDescription>Maiores concentracoes de beneficiarios filtradas pela visao atual.</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.slice(0, 6)} layout="vertical" margin={{ left: 16 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="nome" width={180} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value: number) => formatInteger(value)} />
            <Bar dataKey="totalBeneficiarios" fill="hsl(var(--primary))" radius={12} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
