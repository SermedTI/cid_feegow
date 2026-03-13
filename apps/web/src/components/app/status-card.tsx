import type { LucideIcon } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatusCardProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  className?: string;
}

export function StatusCard({ title, description, icon: Icon, className }: StatusCardProps) {
  return (
    <Card className={cn("border-dashed bg-card/70", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {Icon ? (
            <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
              <Icon />
            </span>
          ) : null}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
