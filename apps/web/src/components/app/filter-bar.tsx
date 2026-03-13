import { BadgeX, SlidersHorizontal } from "lucide-react";
import { startTransition } from "react";

import type { DashboardFilters } from "@andre/shared";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface FilterBarProps {
  filters: DashboardFilters;
  onChange: (next: DashboardFilters) => void;
  onReset: () => void;
}

export function FilterBar({ filters, onChange, onReset }: FilterBarProps) {
  const activeFilterCount = [
    filters.empresa,
    filters.nome,
    filters.matricula,
    filters.matriculaPep,
    filters.titular,
  ].filter(Boolean).length;

  function updateField(key: keyof DashboardFilters, value: string) {
    startTransition(() => {
      onChange({ ...filters, [key]: value, page: 1 });
    });
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <SlidersHorizontal className="text-primary" />
          Filtros analiticos
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Input placeholder="Empresa" value={filters.empresa ?? ""} onChange={(event) => updateField("empresa", event.target.value)} />
          <Input placeholder="Nome do beneficiario" value={filters.nome ?? ""} onChange={(event) => updateField("nome", event.target.value)} />
          <Input placeholder="Matricula" value={filters.matricula ?? ""} onChange={(event) => updateField("matricula", event.target.value)} />
          <Input placeholder="Matricula PEP" value={filters.matriculaPep ?? ""} onChange={(event) => updateField("matriculaPep", event.target.value)} />
          <Input placeholder="Titular" value={filters.titular ?? ""} onChange={(event) => updateField("titular", event.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" disabled>
            {activeFilterCount} filtro{activeFilterCount === 1 ? "" : "s"} ativo{activeFilterCount === 1 ? "" : "s"}
          </Button>
          <Button type="button" variant="outline" onClick={onReset} disabled={!activeFilterCount}>
            <BadgeX data-icon="inline-start" />
            Limpar filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
