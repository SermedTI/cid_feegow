import type { QueryResultRow } from "pg";
import type {
  BeneficiarioRow,
  CompanyDetailResponse,
  DashboardCompanyListItem,
  DashboardFilters,
  DashboardSummary,
  PaginatedResponse,
  TopCompanyItem,
} from "@andre/shared";
import { pool } from "../pool.js";
import { AppError } from "../../lib/app-error.js";

interface WhereClause {
  sql: string;
  values: Array<string | number>;
}

function buildBeneficiariosWhere(filters: DashboardFilters): WhereClause {
  const clauses: string[] = [];
  const values: Array<string | number> = [];

  if (filters.empresa) {
    values.push(Number(filters.empresa));
    clauses.push(`empresa = $${values.length}`);
  }

  if (filters.nome) {
    values.push(`%${filters.nome}%`);
    clauses.push(`nome ILIKE $${values.length}`);
  }

  if (filters.matricula) {
    values.push(Number(filters.matricula));
    clauses.push(`matricula = $${values.length}`);
  }

  if (filters.matriculaPep) {
    values.push(Number(filters.matriculaPep));
    clauses.push(`matricula_pep = $${values.length}`);
  }

  if (filters.titular) {
    values.push(Number(filters.titular));
    clauses.push(`titular = $${values.length}`);
  }

  return {
    sql: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
    values,
  };
}

function getPaging(filters: DashboardFilters) {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function mapBeneficiario(row: Record<string, string | number | null>): BeneficiarioRow {
  return {
    empresa: Number(row.empresa),
    nome: String(row.nome),
    matricula: Number(row.matricula),
    matriculaPep: row.matricula_pep === null ? null : Number(row.matricula_pep),
    titular: row.titular === null ? null : Number(row.titular),
    isTitular: Boolean(row.is_titular),
  };
}

function mapCompany(row: QueryResultRow): DashboardCompanyListItem {
  const totalBeneficiarios = Number(row.total_beneficiarios);
  const totalTitulares = Number(row.total_titulares);
  return {
    empresaId: Number(row.empresa_id),
    nome: String(row.nome),
    totalBeneficiarios,
    totalTitulares,
    totalDependentes: Number(row.total_dependentes),
    matriculasPepDistintas: Number(row.matriculas_pep_distintas),
    coberturaTitularesPercent:
      totalBeneficiarios === 0 ? 0 : Number(((totalTitulares / totalBeneficiarios) * 100).toFixed(2)),
  };
}

export async function getDashboardSummary(filters: DashboardFilters): Promise<DashboardSummary> {
  const where = buildBeneficiariosWhere(filters);

  const summaryResult = await pool.query(
    `
      WITH filtered AS (
        SELECT empresa, nome, matricula, matricula_pep, titular
        FROM cad_plano_benef
        ${where.sql}
      )
      SELECT
        COUNT(*)::int AS total_beneficiarios,
        COUNT(DISTINCT empresa)::int AS total_empresas,
        COUNT(*) FILTER (WHERE matricula = titular)::int AS total_titulares,
        COUNT(*) FILTER (WHERE matricula <> titular)::int AS total_dependentes,
        COUNT(DISTINCT titular)::int AS total_titulares_distintos,
        COUNT(DISTINCT matricula_pep)::int AS total_matriculas_pep_distintas
      FROM filtered
    `,
    where.values,
  );

  const topResult = await pool.query(
    `
      WITH filtered AS (
        SELECT empresa, nome, matricula, titular
        FROM cad_plano_benef
        ${where.sql}
      )
      SELECT
        empresa AS empresa_id,
        MAX(nome) AS nome,
        COUNT(*)::int AS total_beneficiarios,
        COUNT(*) FILTER (WHERE matricula = titular)::int AS total_titulares,
        COUNT(*) FILTER (WHERE matricula <> titular)::int AS total_dependentes
      FROM filtered
      GROUP BY empresa
      ORDER BY total_beneficiarios DESC, nome ASC
      LIMIT 10
    `,
    where.values,
  );

  const row = summaryResult.rows[0];
  const totalEmpresas = Number(row.total_empresas);
  const totalBeneficiarios = Number(row.total_beneficiarios);

  return {
    totalBeneficiarios,
    totalEmpresas,
    totalTitulares: Number(row.total_titulares),
    totalDependentes: Number(row.total_dependentes),
    totalTitularesDistintos: Number(row.total_titulares_distintos),
    totalMatriculasPepDistintas: Number(row.total_matriculas_pep_distintas),
    averageBeneficiariosPerEmpresa:
      totalEmpresas === 0 ? 0 : Number((totalBeneficiarios / totalEmpresas).toFixed(2)),
    topEmpresas: topResult.rows.map((top: QueryResultRow): TopCompanyItem => ({
      empresaId: Number(top.empresa_id),
      nome: String(top.nome),
      totalBeneficiarios: Number(top.total_beneficiarios),
      totalTitulares: Number(top.total_titulares),
      totalDependentes: Number(top.total_dependentes),
    })),
  };
}

export async function listCompanies(filters: DashboardFilters): Promise<PaginatedResponse<DashboardCompanyListItem>> {
  const where = buildBeneficiariosWhere(filters);
  const { page, pageSize, offset } = getPaging(filters);
  const sortByMap: Record<NonNullable<DashboardFilters["sort"]>, string> = {
    empresa: "empresa_id",
    nome: "nome",
    beneficiarios: "total_beneficiarios",
    titulares: "total_titulares",
    dependentes: "total_dependentes",
  };
  const sortBy = sortByMap[filters.sort ?? "beneficiarios"];
  const sortDirection = filters.order === "asc" ? "ASC" : "DESC";
  const values = [...where.values, pageSize, offset];

  const result = await pool.query(
    `
      WITH filtered AS (
        SELECT empresa, nome, matricula, matricula_pep, titular
        FROM cad_plano_benef
        ${where.sql}
      ), grouped AS (
        SELECT
          empresa AS empresa_id,
          MAX(nome) AS nome,
          COUNT(*)::int AS total_beneficiarios,
          COUNT(*) FILTER (WHERE matricula = titular)::int AS total_titulares,
          COUNT(*) FILTER (WHERE matricula <> titular)::int AS total_dependentes,
          COUNT(DISTINCT matricula_pep)::int AS matriculas_pep_distintas
        FROM filtered
        GROUP BY empresa
      )
      SELECT *, COUNT(*) OVER()::int AS total_count
      FROM grouped
      ORDER BY ${sortBy} ${sortDirection}, nome ASC
      LIMIT $${where.values.length + 1}
      OFFSET $${where.values.length + 2}
    `,
    values,
  );

  const total = result.rows[0] ? Number(result.rows[0].total_count) : 0;
  return {
    data: result.rows.map(mapCompany),
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}

export async function getCompanyDetail(empresaId: number, filters: DashboardFilters): Promise<CompanyDetailResponse> {
  const summaryResult = await pool.query(
    `
      SELECT
        empresa AS empresa_id,
        MAX(nome) AS nome,
        COUNT(*)::int AS total_beneficiarios,
        COUNT(*) FILTER (WHERE matricula = titular)::int AS total_titulares,
        COUNT(*) FILTER (WHERE matricula <> titular)::int AS total_dependentes,
        COUNT(DISTINCT matricula_pep)::int AS matriculas_pep_distintas
      FROM cad_plano_benef
      WHERE empresa = $1
      GROUP BY empresa
      LIMIT 1
    `,
    [empresaId],
  );

  if (!summaryResult.rows[0]) {
    throw new AppError(404, "Empresa nao encontrada.");
  }

  const beneficiaries = await listBeneficiarios({ ...filters, empresa: String(empresaId) });

  return {
    summary: mapCompany(summaryResult.rows[0]),
    beneficiaries,
  };
}

export async function listBeneficiarios(filters: DashboardFilters): Promise<PaginatedResponse<BeneficiarioRow>> {
  const where = buildBeneficiariosWhere(filters);
  const { page, pageSize, offset } = getPaging(filters);
  const values = [...where.values, pageSize, offset];

  const result = await pool.query(
    `
      SELECT
        empresa,
        nome,
        matricula,
        matricula_pep,
        titular,
        (matricula = titular) AS is_titular,
        COUNT(*) OVER()::int AS total_count
      FROM cad_plano_benef
      ${where.sql}
      ORDER BY nome ASC, matricula ASC
      LIMIT $${where.values.length + 1}
      OFFSET $${where.values.length + 2}
    `,
    values,
  );

  const total = result.rows[0] ? Number(result.rows[0].total_count) : 0;
  return {
    data: result.rows.map(mapBeneficiario),
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}
