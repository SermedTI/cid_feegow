import type { DashboardFilters } from "@andre/shared";
import { dashboardService } from "../services/dashboard-service.js";
import {
  createDoc,
  drawHeader,
  drawInfoBar,
  drawMetrics,
  drawSectionTitle,
  drawTable,
  drawFooter,
  fmtNum,
} from "./pdf-helpers.js";

function formatFilters(filters: DashboardFilters) {
  const entries = [
    filters.empresa ? `Empresa: ${filters.empresa}` : null,
    filters.nome ? `Nome: ${filters.nome}` : null,
    filters.matricula ? `Matricula: ${filters.matricula}` : null,
    filters.matriculaPep ? `Matricula PEP: ${filters.matriculaPep}` : null,
    filters.titular ? `Titular: ${filters.titular}` : null,
  ].filter(Boolean);

  return entries.length > 0 ? entries.join(" | ") : "Sem filtros";
}

export async function buildDashboardPdf(filters: DashboardFilters) {
  const [summary, companies] = await Promise.all([
    dashboardService.getSummary(filters),
    dashboardService.listCompanies({ ...filters, page: 1, pageSize: 30, sort: "beneficiarios", order: "desc" }),
  ]);

  const { doc, bufferPromise } = createDoc();

  // ── Header ──
  drawHeader(doc, "Relatorio de Beneficiarios", "Analise consolidada por empresa — cad_plano_benef");

  // ── Info bar ──
  drawInfoBar(doc, formatFilters(filters));

  // ── Metrics ──
  drawMetrics(doc, [
    { label: "Beneficiarios", value: fmtNum(summary.totalBeneficiarios) },
    { label: "Empresas", value: fmtNum(summary.totalEmpresas) },
    { label: "Titulares", value: fmtNum(summary.totalTitulares) },
    { label: "Dependentes", value: fmtNum(summary.totalDependentes) },
  ]);

  drawMetrics(doc, [
    { label: "Titulares distintos", value: fmtNum(summary.totalTitularesDistintos) },
    { label: "Matriculas PEP distintas", value: fmtNum(summary.totalMatriculasPepDistintas) },
    { label: "Media por empresa", value: fmtNum(summary.averageBeneficiariosPerEmpresa) },
  ]);

  // ── Top empresas table ──
  drawSectionTitle(doc, `Ranking de empresas (${companies.data.length} de ${fmtNum(companies.total)})`);

  drawTable(
    doc,
    [
      { label: "ID", width: 0.08, align: "right" },
      { label: "Empresa", width: 0.40 },
      { label: "Beneficiarios", width: 0.15, align: "right" },
      { label: "Titulares", width: 0.13, align: "right" },
      { label: "Dependentes", width: 0.13, align: "right" },
      { label: "Cobertura", width: 0.11, align: "right" },
    ],
    companies.data.map((c) => [
      String(c.empresaId),
      c.nome,
      fmtNum(c.totalBeneficiarios),
      fmtNum(c.totalTitulares),
      fmtNum(c.totalDependentes),
      `${c.coberturaTitularesPercent.toFixed(1)}%`,
    ]),
  );

  // ── Footer ──
  drawFooter(doc, "CID Feegow Platform — Relatorio de Beneficiarios");

  doc.end();
  return bufferPromise;
}
