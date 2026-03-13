import type {
  CidDashboardFilters,
  CidDashboardSummary,
  CidTopItem,
  CompanyCidListItem,
  PaginatedResponse,
} from "@andre/shared";
import { getCachedCidDashboardSummary, hasCidDashboardCache, listCachedCompanyCidRows } from "./cid-dashboard-cache.js";
import { pool } from "../pool.js";

interface WhereClause {
  sql: string;
  values: Array<string | number | number[]>;
}

const PATIENT_ID_NUMERIC_SQL = `NULLIF(regexp_replace(d."PacienteID", '[^0-9]', '', 'g'), '')::numeric`;
const CID_CODE_SQL = `COALESCE(NULLIF(d."Codigo", ''), 'SEM_CID')`;
const CID_CODE_SEARCH_SQL = `UPPER(COALESCE(NULLIF(d."Codigo", ''), 'SEM_CID'))`;
const CID_DESCRIPTION_SQL = `COALESCE(NULLIF(d."DescricaoCID", ''), NULLIF(d."Cid", ''), 'CID sem descricao')`;
const DATAHORA_SORTKEY_SQL = `(substring(d."DataHora" from 7 for 4) || substring(d."DataHora" from 4 for 2) || substring(d."DataHora" from 1 for 2) || substring(d."DataHora" from 12 for 2) || substring(d."DataHora" from 15 for 2))`;
const DATAHORA_TIMESTAMP_SQL = `to_timestamp(d."DataHora", 'DD/MM/YYYY HH24:MI')`;

function buildCidWhere(filters: CidDashboardFilters): WhereClause {
  const clauses: string[] = [];
  const values: Array<string | number | number[]> = [];

  if (filters.empresa) {
    const ids = filters.empresa.split(",").map(Number).filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length === 1) {
      values.push(ids[0]);
      clauses.push(`b.empresa = $${values.length}`);
    } else if (ids.length > 1) {
      values.push(ids);
      clauses.push(`b.empresa = ANY($${values.length}::int[])`);
    }
  }

  if (filters.cidCodigo) {
    values.push(`%${filters.cidCodigo.trim().toUpperCase()}%`);
    clauses.push(`${CID_CODE_SEARCH_SQL} LIKE $${values.length}`);
  }

  if (filters.descricao) {
    values.push(`%${filters.descricao.trim()}%`);
    clauses.push(`${CID_DESCRIPTION_SQL} ILIKE $${values.length}`);
  }

  if (filters.startDate) {
    values.push(`${filters.startDate.replaceAll("-", "")}0000`);
    clauses.push(`${DATAHORA_SORTKEY_SQL} >= $${values.length}`);
  }

  if (filters.endDate) {
    values.push(`${filters.endDate.replaceAll("-", "")}2359`);
    clauses.push(`${DATAHORA_SORTKEY_SQL} <= $${values.length}`);
  }

  return {
    sql: clauses.length > 0 ? `AND ${clauses.join(" AND ")}` : "",
    values,
  };
}

function getPaging(filters: CidDashboardFilters) {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function hasRawFilters(filters: CidDashboardFilters) {
  return Boolean(filters.empresa || filters.cidCodigo || filters.descricao || filters.startDate || filters.endDate);
}

function getMatchedDiagnosticsCte(filtersSQL: string) {
  return `
    WITH matched AS (
      SELECT
        b.empresa::int AS empresa_id,
        MAX(b.nome) OVER (
          PARTITION BY b.empresa
        )::text AS empresa_nome,
        b.matricula_pep::numeric AS matricula_pep,
        ${CID_CODE_SQL}::text AS codigo,
        ${CID_DESCRIPTION_SQL}::text AS descricao,
        ${DATAHORA_SORTKEY_SQL}::text AS diagnosis_sort_key,
        ${DATAHORA_TIMESTAMP_SQL} AS diagnosis_at
      FROM cad_plano_benef b
      JOIN diagnostics d
        ON ${PATIENT_ID_NUMERIC_SQL} = b.matricula_pep
      WHERE b.matricula_pep IS NOT NULL
        AND NULLIF(regexp_replace(d."PacienteID", '[^0-9]', '', 'g'), '') IS NOT NULL
        AND d."DataHora" IS NOT NULL
        ${filtersSQL}
    )
  `;
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

export async function getCidDashboardSummary(filters: CidDashboardFilters): Promise<CidDashboardSummary> {
  if (!hasRawFilters(filters) && await hasCidDashboardCache()) {
    return getCachedCidDashboardSummary();
  }

  const where = buildCidWhere(filters);
  const cte = getMatchedDiagnosticsCte(where.sql);

  const result = await pool.query(
    `
      ${cte}
      , summary AS (
        SELECT
          COUNT(*)::int AS total_diagnosticos,
          COUNT(DISTINCT empresa_id)::int AS total_empresas,
          COUNT(DISTINCT codigo)::int AS total_cids,
          COUNT(DISTINCT matricula_pep)::int AS total_pacientes,
          MAX(diagnosis_at) AS latest_diagnosis_at
        FROM matched
      ), top_cids AS (
        SELECT
          codigo,
          MAX(descricao) AS descricao,
          COUNT(*)::int AS total_diagnosticos,
          COUNT(DISTINCT matricula_pep)::int AS total_pacientes,
          COUNT(DISTINCT empresa_id)::int AS total_empresas
        FROM matched
        GROUP BY codigo
        ORDER BY total_diagnosticos DESC, codigo ASC
        LIMIT 10
      )
      SELECT
        'summary' AS _type,
        s.total_diagnosticos,
        s.total_empresas,
        s.total_cids,
        s.total_pacientes,
        s.latest_diagnosis_at,
        NULL AS codigo,
        NULL AS descricao
      FROM summary s
      UNION ALL
      SELECT
        'top_cid' AS _type,
        t.total_diagnosticos,
        t.total_empresas,
        NULL::int AS total_cids,
        t.total_pacientes,
        NULL AS latest_diagnosis_at,
        t.codigo,
        t.descricao
      FROM top_cids t
    `,
    where.values,
  );

  const summaryRow = result.rows.find((r: Record<string, unknown>) => r._type === "summary");
  const topRows = result.rows.filter((r: Record<string, unknown>) => r._type === "top_cid");

  return {
    totalDiagnosticos: Number(summaryRow?.total_diagnosticos ?? 0),
    totalEmpresas: Number(summaryRow?.total_empresas ?? 0),
    totalCids: Number(summaryRow?.total_cids ?? 0),
    totalPacientes: Number(summaryRow?.total_pacientes ?? 0),
    latestDiagnosisAt: summaryRow?.latest_diagnosis_at ? new Date(String(summaryRow.latest_diagnosis_at)).toISOString() : null,
    topCids: topRows.map(mapTopCid),
  };
}

export async function listCompanyCidRows(filters: CidDashboardFilters): Promise<PaginatedResponse<CompanyCidListItem>> {
  const { page, pageSize, offset } = getPaging(filters);

  if (!hasRawFilters(filters) && await hasCidDashboardCache()) {
    return listCachedCompanyCidRows(page, pageSize, filters.sort, filters.order);
  }

  const where = buildCidWhere(filters);
  const cte = getMatchedDiagnosticsCte(where.sql);
  const sortByMap: Record<NonNullable<CidDashboardFilters["sort"]>, string> = {
    empresa: "empresa_nome",
    cid: "codigo",
    descricao: "descricao",
    diagnosticos: "total_diagnosticos",
    pacientes: "total_pacientes",
    ultimaData: "last_diagnosis_at",
  };
  const sortBy = sortByMap[filters.sort ?? "diagnosticos"];
  const sortDirection = filters.order === "asc" ? "ASC" : "DESC";
  const values = [...where.values, pageSize, offset];

  const result = await pool.query(
    `
      ${cte}
      , grouped AS (
        SELECT
          empresa_id,
          MAX(empresa_nome) AS empresa_nome,
          codigo,
          MAX(descricao) AS descricao,
          COUNT(*)::int AS total_diagnosticos,
          COUNT(DISTINCT matricula_pep)::int AS total_pacientes,
          MAX(diagnosis_at) AS last_diagnosis_at
        FROM matched
        GROUP BY empresa_id, codigo
      )
      SELECT *, COUNT(*) OVER()::int AS total_count
      FROM grouped
      ORDER BY ${sortBy} ${sortDirection}, empresa_nome ASC, codigo ASC
      LIMIT $${where.values.length + 1}
      OFFSET $${where.values.length + 2}
    `,
    values,
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
