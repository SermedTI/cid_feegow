import type { CidTopItem } from "@andre/shared";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { StatusCard } from "@/components/app/status-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInteger } from "@/lib/utils";

interface CidTopChartProps {
  data: CidTopItem[];
}

export function CidTopChart({ data }: CidTopChartProps) {
  if (!data.length) {
    return (
      <StatusCard
        title="CIDs mais recorrentes"
        description="Nenhum CID foi encontrado no cruzamento atual."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>CIDs mais recorrentes</CardTitle>
        <CardDescription>Ranking agregado por volume de diagnosticos vinculados a empresas.</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.slice(0, 8)} layout="vertical" margin={{ left: 16 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="codigo"
              width={96}
              tick={{ fontSize: 12 }}
            />
            <Tooltip formatter={(value: number) => formatInteger(value)} />
            <Bar dataKey="totalDiagnosticos" fill="hsl(var(--primary))" radius={12} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
