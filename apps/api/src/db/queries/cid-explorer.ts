import type {
  CidCompanyDrillItem,
  CidCompanyDrillResponse,
  CidExplorerCidRow,
  CidExplorerCompanyRow,
  CompanyCidDrillItem,
  CompanyCidDrillResponse,
  CompanySearchItem,
} from "@andre/shared";
import { pool } from "../pool.js";
import { AppError } from "../../lib/app-error.js";
import { hasCidDashboardCache } from "./cid-dashboard-cache.js";

const PATIENT_ID_NUMERIC_SQL = `NULLIF(regexp_replace(d."PacienteID", '[^0-9]', '', 'g'), '')::numeric`;
const CID_CODE_SQL = `COALESCE(NULLIF(d."Codigo", ''), 'SEM_CID')`;
const CID_DESCRIPTION_SQL = `COALESCE(NULLIF(d."DescricaoCID", ''), NULLIF(d."Cid", ''), 'CID sem descricao')`;
const DATAHORA_TIMESTAMP_SQL = `to_timestamp(d."DataHora", 'DD/MM/YYYY HH24:MI')`;

const BASE_JOIN = `
  FROM cad_plano_benef b
  JOIN diagnostics d
    ON ${PATIENT_ID_NUMERIC_SQL} = b.matricula_pep
  WHERE b.matricula_pep IS NOT NULL
    AND NULLIF(regexp_replace(d."PacienteID", '[^0-9]', '', 'g'), '') IS NOT NULL
    AND d."DataHora" IS NOT NULL
`;

export async function getCompanyCidDrill(empresaId: number): Promise<CompanyCidDrillResponse> {
  const summaryResult = await pool.query(
    `
      SELECT
        b.empresa::int AS empresa_id,
        MAX(b.nome)::text AS empresa_nome,
        COUNT(*)::int AS total_diagnosticos,
        COUNT(DISTINCT ${CID_CODE_SQL})::int AS total_cids_distintos,
        COUNT(DISTINCT b.matricula_pep)::int AS total_pacientes
      ${BASE_JOIN}
        AND b.empresa = $1
      GROUP BY b.empresa
    `,
    [empresaId],
  );

  if (!summaryResult.rows[0]) {
    throw new AppError(404, "Empresa nao encontrada ou sem diagnosticos vinculados.");
  }

  const row = summaryResult.rows[0];

  const cidsResult = await pool.query(
    `
      SELECT
        ${CID_CODE_SQL}::text AS codigo,
        MAX(${CID_DESCRIPTION_SQL})::text AS descricao,
        COUNT(*)::int AS total_diagnosticos,
        COUNT(DISTINCT b.matricula_pep)::int AS total_pacientes,
        MAX(${DATAHORA_TIMESTAMP_SQL}) AS last_diagnosis_at
      ${BASE_JOIN}
        AND b.empresa = $1
      GROUP BY ${CID_CODE_SQL}
      ORDER BY total_diagnosticos DESC, codigo ASC
      LIMIT 50
    `,
    [empresaId],
  );

  return {
    empresaId: Number(row.empresa_id),
    empresaNome: String(row.empresa_nome),
    totalDiagnosticos: Number(row.total_diagnosticos),
    totalCidsDistintos: Number(row.total_cids_distintos),
    totalPacientes: Number(row.total_pacientes),
    cids: cidsResult.rows.map((r: Record<string, unknown>): CompanyCidDrillItem => ({
      codigo: String(r.codigo),
      descricao: String(r.descricao),
      totalDiagnosticos: Number(r.total_diagnosticos),
      totalPacientes: Number(r.total_pacientes),
      lastDiagnosisAt: r.last_diagnosis_at ? new Date(String(r.last_diagnosis_at)).toISOString() : null,
    })),
  };
}

export async function getCidCompanyDrill(codigo: string): Promise<CidCompanyDrillResponse> {
  const cidFilter = codigo.toUpperCase();

  const summaryResult = await pool.query(
    `
      SELECT
        ${CID_CODE_SQL}::text AS codigo,
        MAX(${CID_DESCRIPTION_SQL})::text AS descricao,
        COUNT(*)::int AS total_diagnosticos,
        COUNT(DISTINCT b.empresa)::int AS total_empresas,
        COUNT(DISTINCT b.matricula_pep)::int AS total_pacientes
      ${BASE_JOIN}
        AND UPPER(${CID_CODE_SQL}) = $1
      GROUP BY ${CID_CODE_SQL}
    `,
    [cidFilter],
  );

  if (!summaryResult.rows[0]) {
    throw new AppError(404, "CID nao encontrado nos diagnosticos vinculados.");
  }

  const row = summaryResult.rows[0];

  const empresasResult = await pool.query(
    `
      SELECT
        b.empresa::int AS empresa_id,
        MAX(b.nome)::text AS empresa_nome,
        COUNT(*)::int AS total_diagnosticos,
        COUNT(DISTINCT b.matricula_pep)::int AS total_pacientes,
        MAX(${DATAHORA_TIMESTAMP_SQL}) AS last_diagnosis_at
      ${BASE_JOIN}
        AND UPPER(${CID_CODE_SQL}) = $1
      GROUP BY b.empresa
      ORDER BY total_diagnosticos DESC, empresa_nome ASC
      LIMIT 50
    `,
    [cidFilter],
  );

  return {
    codigo: String(row.codigo),
    descricao: String(row.descricao),
    totalDiagnosticos: Number(row.total_diagnosticos),
    totalEmpresas: Number(row.total_empresas),
    totalPacientes: Number(row.total_pacientes),
    empresas: empresasResult.rows.map((r: Record<string, unknown>): CidCompanyDrillItem => ({
      empresaId: Number(r.empresa_id),
      empresaNome: String(r.empresa_nome),
      totalDiagnosticos: Number(r.total_diagnosticos),
      totalPacientes: Number(r.total_pacientes),
      lastDiagnosisAt: r.last_diagnosis_at ? new Date(String(r.last_diagnosis_at)).toISOString() : null,
    })),
  };
}

async function explorerViewExists(name: string) {
  const result = await pool.query(
    `SELECT EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = $1) AS exists`,
    [name],
  );
  return Boolean(result.rows[0]?.exists);
}

export async function listExplorerCompanies(): Promise<CidExplorerCompanyRow[]> {
  // Use materialized view if available (instant query)
  if (await explorerViewExists("mv_cid_explorer_companies")) {
    const result = await pool.query(
      `SELECT empresa_id, empresa_nome, total_diagnosticos, total_cids_distintos, total_pacientes
       FROM public.mv_cid_explorer_companies
       ORDER BY total_diagnosticos DESC
       LIMIT 30`,
    );
    return result.rows.map((r: Record<string, unknown>): CidExplorerCompanyRow => ({
      empresaId: Number(r.empresa_id),
      empresaNome: String(r.empresa_nome),
      totalDiagnosticos: Number(r.total_diagnosticos),
      totalCidsDistintos: Number(r.total_cids_distintos),
      totalPacientes: Number(r.total_pacientes),
    }));
  }

  // Fallback to live query
  const result = await pool.query(
    `
      SELECT
        b.empresa::int AS empresa_id,
        MAX(b.nome)::text AS empresa_nome,
        COUNT(*)::int AS total_diagnosticos,
        COUNT(DISTINCT ${CID_CODE_SQL})::int AS total_cids_distintos,
        COUNT(DISTINCT b.matricula_pep)::int AS total_pacientes
      ${BASE_JOIN}
      GROUP BY b.empresa
      ORDER BY total_diagnosticos DESC
      LIMIT 30
    `,
  );

  return result.rows.map((r: Record<string, unknown>): CidExplorerCompanyRow => ({
    empresaId: Number(r.empresa_id),
    empresaNome: String(r.empresa_nome),
    totalDiagnosticos: Number(r.total_diagnosticos),
    totalCidsDistintos: Number(r.total_cids_distintos),
    totalPacientes: Number(r.total_pacientes),
  }));
}

export async function listExplorerCids(): Promise<CidExplorerCidRow[]> {
  // Use materialized view if available (instant query)
  if (await explorerViewExists("mv_cid_explorer_cids")) {
    const result = await pool.query(
      `SELECT codigo, descricao, total_diagnosticos, total_empresas, total_pacientes
       FROM public.mv_cid_explorer_cids
       ORDER BY total_diagnosticos DESC
       LIMIT 30`,
    );
    return result.rows.map((r: Record<string, unknown>): CidExplorerCidRow => ({
      codigo: String(r.codigo),
      descricao: String(r.descricao),
      totalDiagnosticos: Number(r.total_diagnosticos),
      totalEmpresas: Number(r.total_empresas),
      totalPacientes: Number(r.total_pacientes),
    }));
  }

  // Fallback to live query
  const result = await pool.query(
    `
      SELECT
        ${CID_CODE_SQL}::text AS codigo,
        MAX(${CID_DESCRIPTION_SQL})::text AS descricao,
        COUNT(*)::int AS total_diagnosticos,
        COUNT(DISTINCT b.empresa)::int AS total_empresas,
        COUNT(DISTINCT b.matricula_pep)::int AS total_pacientes
      ${BASE_JOIN}
      GROUP BY ${CID_CODE_SQL}
      ORDER BY total_diagnosticos DESC
      LIMIT 30
    `,
  );

  return result.rows.map((r: Record<string, unknown>): CidExplorerCidRow => ({
    codigo: String(r.codigo),
    descricao: String(r.descricao),
    totalDiagnosticos: Number(r.total_diagnosticos),
    totalEmpresas: Number(r.total_empresas),
    totalPacientes: Number(r.total_pacientes),
  }));
}

export async function searchCompanies(query: string): Promise<CompanySearchItem[]> {
  const pattern = `%${query.trim()}%`;

  // Use materialized view if available (fast)
  if (await explorerViewExists("mv_cid_company_cid_agg")) {
    const result = await pool.query(
      `SELECT DISTINCT empresa_id, empresa_nome
       FROM public.mv_cid_company_cid_agg
       WHERE empresa_nome ILIKE $1
       ORDER BY empresa_nome
       LIMIT 15`,
      [pattern],
    );
    return result.rows.map((r: Record<string, unknown>): CompanySearchItem => ({
      empresaId: Number(r.empresa_id),
      empresaNome: String(r.empresa_nome),
    }));
  }

  // Fallback to base table
  const result = await pool.query(
    `SELECT DISTINCT empresa::int AS empresa_id, nome::text AS empresa_nome
     FROM cad_plano_benef
     WHERE nome ILIKE $1 AND empresa IS NOT NULL
     ORDER BY empresa_nome
     LIMIT 15`,
    [pattern],
  );
  return result.rows.map((r: Record<string, unknown>): CompanySearchItem => ({
    empresaId: Number(r.empresa_id),
    empresaNome: String(r.empresa_nome),
  }));
}
