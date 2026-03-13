import { BadgeX, CalendarRange, Filter, X } from "lucide-react";
import { startTransition, useCallback, useEffect, useRef, useState } from "react";

import type { CompanySearchItem, CidDashboardFilters } from "@andre/shared";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/http";

interface CidFilterBarProps {
  filters: CidDashboardFilters;
  onChange: (next: CidDashboardFilters) => void;
  onReset: () => void;
}

export function CidFilterBar({ filters, onChange, onReset }: CidFilterBarProps) {
  const { token } = useAuth();
  const [empresaText, setEmpresaText] = useState("");
  const [selectedCompanies, setSelectedCompanies] = useState<CompanySearchItem[]>([]);
  const [suggestions, setSuggestions] = useState<CompanySearchItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync when filters are reset externally
  useEffect(() => {
    if (!filters.empresa) {
      setSelectedCompanies([]);
      setEmpresaText("");
      setSuggestions([]);
    }
  }, [filters.empresa]);

  const searchCompanies = useCallback(
    (query: string) => {
      if (!token || query.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      api
        .searchCidCompanies(query, token)
        .then((results) => {
          // Filter out already-selected companies
          const selectedIds = new Set(selectedCompanies.map((c) => c.empresaId));
          const filtered = results.filter((r) => !selectedIds.has(r.empresaId));
          setSuggestions(filtered);
          setShowSuggestions(filtered.length > 0);
        })
        .catch(() => setSuggestions([]));
    },
    [token, selectedCompanies],
  );

  function handleEmpresaInput(value: string) {
    setEmpresaText(value);

    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCompanies(value), 300);
  }

  function applyCompanyFilter(companies: CompanySearchItem[]) {
    const empresaValue = companies.length > 0 ? companies.map((c) => c.empresaId).join(",") : undefined;
    startTransition(() => {
      onChange({ ...filters, empresa: empresaValue, page: 1 });
    });
  }

  function selectCompany(item: CompanySearchItem) {
    const next = [...selectedCompanies, item];
    setSelectedCompanies(next);
    setEmpresaText("");
    setSuggestions([]);
    setShowSuggestions(false);
    applyCompanyFilter(next);
  }

  function removeCompany(empresaId: number) {
    const next = selectedCompanies.filter((c) => c.empresaId !== empresaId);
    setSelectedCompanies(next);
    applyCompanyFilter(next);
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleReset() {
    setEmpresaText("");
    setSelectedCompanies([]);
    setSuggestions([]);
    setShowSuggestions(false);
    onReset();
  }

  const activeFilterCount = [
    filters.empresa,
    filters.cidCodigo,
    filters.descricao,
    filters.startDate,
    filters.endDate,
  ].filter(Boolean).length;

  function updateField(key: keyof CidDashboardFilters, value: string) {
    startTransition(() => {
      onChange({ ...filters, [key]: value, page: 1 });
    });
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Filter className="text-primary" />
          Filtros de CID por empresa
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div ref={containerRef} className="relative">
            <Input
              placeholder={selectedCompanies.length > 0 ? "Adicionar empresa..." : "Empresa"}
              value={empresaText}
              onChange={(event) => handleEmpresaInput(event.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            />
            {showSuggestions && (
              <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-md">
                {suggestions.map((item) => (
                  <li key={item.empresaId}>
                    <button
                      type="button"
                      className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectCompany(item)}
                    >
                      {item.empresaNome}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Input
            placeholder="Codigo CID"
            value={filters.cidCodigo ?? ""}
            onChange={(event) => updateField("cidCodigo", event.target.value)}
          />
          <Input
            placeholder="Descricao do CID"
            value={filters.descricao ?? ""}
            onChange={(event) => updateField("descricao", event.target.value)}
          />
          <Input
            type="date"
            aria-label="Data inicial"
            value={filters.startDate ?? ""}
            onChange={(event) => updateField("startDate", event.target.value)}
          />
          <Input
            type="date"
            aria-label="Data final"
            value={filters.endDate ?? ""}
            onChange={(event) => updateField("endDate", event.target.value)}
          />
        </div>

        {selectedCompanies.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedCompanies.map((company) => (
              <span
                key={company.empresaId}
                className="inline-flex items-center gap-1 rounded-md border bg-secondary px-2.5 py-1 text-sm font-medium text-secondary-foreground"
              >
                {company.empresaNome}
                <button
                  type="button"
                  className="ml-0.5 rounded-sm opacity-60 hover:opacity-100"
                  onClick={() => removeCompany(company.empresaId)}
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" disabled>
            <CalendarRange data-icon="inline-start" />
            {activeFilterCount} filtro{activeFilterCount === 1 ? "" : "s"} ativo{activeFilterCount === 1 ? "" : "s"}
          </Button>
          <Button type="button" variant="outline" onClick={handleReset} disabled={!activeFilterCount}>
            <BadgeX data-icon="inline-start" />
            Limpar filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
