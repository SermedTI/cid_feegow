import type { CidDashboardFilters, CidDashboardSummary, CidTopItem, CompanyCidListItem, PaginatedResponse } from "@andre/shared";
import { pool } from "../pool.js";

let cacheCheckResult: boolean | null = null;
let cacheCheckExpiresAt = 0;
const CACHE_CHECK_TTL_MS = 60_000;

async function relationExists(name: string) {
  const result = await pool.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM pg_matviews
        WHERE schemaname = 'public' AND matviewname = $1
      ) AS exists
    `,
    [name],
  );

  return Boolean(result.rows[0]?.exists);
}

export async function hasCidDashboardCache() {
  const now = Date.now();
  if (cacheCheckResult !== null && cacheCheckExpiresAt > now) {
    return cacheCheckResult;
  }

  const [companyCid, overview] = await Promise.all([
    relationExists("mv_cid_company_cid_agg"),
    relationExists("mv_cid_dashboard_overview"),
  ]);

  cacheCheckResult = companyCid && overview;
  cacheCheckExpiresAt = now + CACHE_CHECK_TTL_MS;
  return cacheCheckResult;
}

export function invalidateCacheCheck() {
  cacheCheckResult = null;
  cacheCheckExpiresAt = 0;
}

function mapTopCid(row: Record<string, string | number | null>): CidTopItem {
  return {
    codigo: String(row.codigo),
    descricao: String(row.descricao),
    totalDiagnosticos: Number(row.total_diagnosticos),
    totalPacientes: Number(row.total_pacientes),
    totalEmpresas: Number(row.total_empresas),
  };
}

function mapCompanyCidRow(row: Record<string, string | number | null>): CompanyCidListItem {
  return {
    empresaId: Number(row.empresa_id),
    empresaNome: String(row.empresa_nome),
    codigo: String(row.codigo),
    descricao: String(row.descricao),
    totalDiagnosticos: Number(row.total_diagnosticos),
    totalPacientes: Number(row.total_pacientes),
    lastDiagnosisAt: row.last_diagnosis_at ? new Date(String(row.last_diagnosis_at)).toISOString() : null,
  };
}

export async function getCachedCidDashboardSummary(): Promise<CidDashboardSummary> {
  const [overviewResult, topCidResult] = await Promise.all([
    pool.query(`
      SELECT
        total_diagnosticos,
        total_empresas,
        total_cids,
        total_pacientes,
        latest_diagnosis_at
      FROM public.mv_cid_dashboard_overview
      LIMIT 1
    `),
    pool.query(`
      SELECT
        codigo,
        MAX(descricao) AS descricao,
        SUM(total_diagnosticos)::int AS total_diagnosticos,
        SUM(total_pacientes)::int AS total_pacientes,
        COUNT(DISTINCT empresa_id)::int AS total_empresas
      FROM public.mv_cid_company_cid_agg
      GROUP BY codigo
      ORDER BY total_diagnosticos DESC, codigo ASC
      LIMIT 10
    `),
  ]);

  const row = overviewResult.rows[0];

  return {
    totalDiagnosticos: Number(row.total_diagnosticos),
    totalEmpresas: Number(row.total_empresas),
    totalCids: Number(row.total_cids),
    totalPacientes: Number(row.total_pacientes),
    latestDiagnosisAt: row.latest_diagnosis_at ? new Date(String(row.latest_diagnosis_at)).toISOString() : null,
    topCids: topCidResult.rows.map(mapTopCid),
  };
}

const CACHED_SORT_MAP: Record<NonNullable<CidDashboardFilters["sort"]>, string> = {
  empresa: "empresa_nome",
  cid: "codigo",
  descricao: "descricao",
  diagnosticos: "total_diagnosticos",
  pacientes: "total_pacientes",
  ultimaData: "last_diagnosis_at",
};

export async function listCachedCompanyCidRows(
  page: number,
  pageSize: number,
  sort?: CidDashboardFilters["sort"],
  order?: CidDashboardFilters["order"],
): Promise<PaginatedResponse<CompanyCidListItem>> {
  const offset = (page - 1) * pageSize;
  const sortBy = CACHED_SORT_MAP[sort ?? "diagnosticos"];
  const sortDirection = order === "asc" ? "ASC" : "DESC";

  const result = await pool.query(
    `
      SELECT *, COUNT(*) OVER()::int AS total_count
      FROM public.mv_cid_company_cid_agg
      ORDER BY ${sortBy} ${sortDirection}, empresa_nome ASC, codigo ASC
      LIMIT $1
      OFFSET $2
    `,
    [pageSize, offset],
  );

  const total = result.rows[0] ? Number(result.rows[0].total_count) : 0;
  return {
    data: result.rows.map(mapCompanyCidRow),
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}
