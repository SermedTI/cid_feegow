import type { CidDashboardFilters, DashboardFilters } from "@andre/shared";
import { z } from "zod";
import { getCompanyDetail, getDashboardSummary, listBeneficiarios, listCompanies } from "../db/queries/dashboard.js";
import { getCidDashboardSummary, listCompanyCidRows } from "../db/queries/cid-dashboard.js";

const filtersSchema = z.object({
  empresa: z.string().trim().optional(),
  nome: z.string().trim().optional(),
  matricula: z.string().trim().optional(),
  matriculaPep: z.string().trim().optional(),
  titular: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  sort: z.enum(["empresa", "nome", "beneficiarios", "titulares", "dependentes"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

const cidFiltersSchema = z.object({
  empresa: z.string().trim().optional(),
  cidCodigo: z.string().trim().optional(),
  descricao: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  sort: z.enum(["empresa", "cid", "descricao", "diagnosticos", "pacientes", "ultimaData"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

export function parseDashboardFilters(input: unknown): DashboardFilters {
  return filtersSchema.parse(input);
}

export function parseCidDashboardFilters(input: unknown): CidDashboardFilters {
  return cidFiltersSchema.parse(input);
}

export const dashboardService = {
  getSummary(filters: DashboardFilters) {
    return getDashboardSummary(filters);
  },
  listCompanies(filters: DashboardFilters) {
    return listCompanies(filters);
  },
  getCompanyDetail(empresa: number, filters: DashboardFilters) {
    return getCompanyDetail(empresa, filters);
  },
  listBeneficiarios(filters: DashboardFilters) {
    return listBeneficiarios(filters);
  },
  getCidSummary(filters: CidDashboardFilters) {
    return getCidDashboardSummary(filters);
  },
  listCompanyCidRows(filters: CidDashboardFilters) {
    return listCompanyCidRows(filters);
  },
};
