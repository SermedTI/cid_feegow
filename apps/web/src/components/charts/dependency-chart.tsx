import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { StatusCard } from "@/components/app/status-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInteger } from "@/lib/utils";

interface DependencyChartProps {
  titulares: number;
  dependentes: number;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))"];

export function DependencyChart({ titulares, dependentes }: DependencyChartProps) {
  if (titulares + dependentes === 0) {
    return (
      <StatusCard
        title="Composicao da carteira"
        description="Nao ha dados suficientes para montar o grafico com os filtros atuais."
      />
    );
  }

  const data = [
    { name: "Titulares", value: titulares },
    { name: "Dependentes", value: dependentes },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Composicao da carteira</CardTitle>
        <CardDescription>Leitura direta da proporcao entre titulares e dependentes.</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={4}>
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatInteger(value)} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
