import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInteger } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
}

export function MetricCard({ title, value, description, icon: Icon }: MetricCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <CardDescription>{title}</CardDescription>
            <CardTitle className="text-3xl font-semibold tracking-tight">{formatInteger(value)}</CardTitle>
          </div>
          <div className="rounded-full bg-secondary p-2 text-primary">
            <Icon />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
