import type { CidDashboardFilters } from "@andre/shared";
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
  fmtDate,
} from "./pdf-helpers.js";

function formatFilters(filters: CidDashboardFilters) {
  const entries = [
    filters.empresa ? `Empresas: ${filters.empresa}` : null,
    filters.cidCodigo ? `CID: ${filters.cidCodigo}` : null,
    filters.descricao ? `Descricao: ${filters.descricao}` : null,
    filters.startDate ? `De: ${filters.startDate}` : null,
    filters.endDate ? `Ate: ${filters.endDate}` : null,
  ].filter(Boolean);

  return entries.length > 0 ? entries.join(" | ") : "Sem filtros";
}

export async function buildCidDashboardPdf(filters: CidDashboardFilters) {
  const [summary, rows] = await Promise.all([
    dashboardService.getCidSummary(filters),
    dashboardService.listCompanyCidRows({ ...filters, page: 1, pageSize: 50, sort: "diagnosticos", order: "desc" }),
  ]);

  const { doc, bufferPromise } = createDoc();

  // ── Header ──
  drawHeader(doc, "Relatorio Empresa x CID", "Cruzamento de diagnosticos por empresa — diagnostics x cad_plano_benef");

  // ── Info bar ──
  drawInfoBar(doc, formatFilters(filters));

  // ── Metrics ──
  drawMetrics(doc, [
    { label: "Diagnosticos vinculados", value: fmtNum(summary.totalDiagnosticos) },
    { label: "Empresas com CID", value: fmtNum(summary.totalEmpresas) },
    { label: "CIDs distintos", value: fmtNum(summary.totalCids) },
    { label: "Pacientes vinculados", value: fmtNum(summary.totalPacientes) },
  ]);

  // ── Top CIDs table ──
  if (summary.topCids.length > 0) {
    drawSectionTitle(doc, "Top CIDs por volume");

    drawTable(
      doc,
      [
        { label: "CID", width: 0.10 },
        { label: "Descricao", width: 0.46 },
        { label: "Diagnosticos", width: 0.15, align: "right" },
        { label: "Pacientes", width: 0.15, align: "right" },
        { label: "Empresas", width: 0.14, align: "right" },
      ],
      summary.topCids.map((c) => [
        c.codigo,
        c.descricao,
        fmtNum(c.totalDiagnosticos),
        fmtNum(c.totalPacientes),
        fmtNum(c.totalEmpresas),
      ]),
    );
  }

  // ── Empresa x CID matrix ──
  drawSectionTitle(doc, `Matriz Empresa x CID (${rows.data.length} de ${fmtNum(rows.total)} registros)`);

  drawTable(
    doc,
    [
      { label: "Empresa", width: 0.26 },
      { label: "CID", width: 0.08 },
      { label: "Descricao", width: 0.30 },
      { label: "Diag.", width: 0.09, align: "right" },
      { label: "Pac.", width: 0.09, align: "right" },
      { label: "Ultimo", width: 0.18, align: "right" },
    ],
    rows.data.map((r) => [
      r.empresaNome,
      r.codigo,
      r.descricao,
      fmtNum(r.totalDiagnosticos),
      fmtNum(r.totalPacientes),
      fmtDate(r.lastDiagnosisAt),
    ]),
  );

  // ── Footer ──
  drawFooter(doc, "CID Feegow Platform — Relatorio Empresa x CID");

  doc.end();
  return bufferPromise;
}
