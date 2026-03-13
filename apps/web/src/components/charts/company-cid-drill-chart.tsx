import type { CompanyCidDrillItem } from "@andre/shared";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInteger } from "@/lib/utils";

interface CompanyCidDrillChartProps {
  empresaNome: string;
  data: CompanyCidDrillItem[];
}

export function CompanyCidDrillChart({ empresaNome, data }: CompanyCidDrillChartProps) {
  const sliced = data.slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">CIDs de {empresaNome}</CardTitle>
        <CardDescription>Top {sliced.length} codigos CID por volume de diagnosticos nesta empresa.</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sliced} layout="vertical" margin={{ left: 8, right: 16 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="codigo"
              width={80}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))" }}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const item = payload[0].payload as CompanyCidDrillItem;
                return (
                  <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
                    <p className="font-medium">{item.codigo}</p>
                    <p className="text-muted-foreground">{item.descricao}</p>
                    <p className="mt-1">{formatInteger(item.totalDiagnosticos)} diagnosticos</p>
                    <p>{formatInteger(item.totalPacientes)} pacientes</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="totalDiagnosticos" fill="hsl(var(--primary))" radius={8} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
