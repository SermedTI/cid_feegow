import type {
  CidCompanyDrillResponse,
  CidDashboardFilters,
  CidDashboardSummary,
  CidExplorerCidRow,
  CidExplorerCompanyRow,
  CompanyCidDrillResponse,
  CompanyDetailResponse,
  CompanyCidListItem,
  CompanySearchItem,
  CreateUserInput,
  DashboardCompanyListItem,
  DashboardFilters,
  DashboardSummary,
  PaginatedResponse,
  UserListItem,
} from "@andre/shared";

import { buildQueryString } from "@/lib/utils";

function resolveApiBaseUrl() {
  // Explicit URL (e.g. local dev with separate API port)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // In production, Nginx proxies API routes on the same origin,
  // so an empty base URL makes fetch() use relative paths.
  if (import.meta.env.PROD) {
    return "";
  }

  // Dev fallback: API on the same hostname, different port
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:3333`;
  }

  return "http://localhost:3333";
}

export const API_BASE_URL = resolveApiBaseUrl();

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: "Erro inesperado." }));
    throw new ApiError(body.message ?? "Erro inesperado.", response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function dashboardQuery(filters: object) {
  const query = buildQueryString(filters);
  return query ? `?${query}` : "";
}

export const api = {
  baseUrl: API_BASE_URL,
  getSummary(filters: DashboardFilters, token: string) {
    return request<DashboardSummary>(`/dashboard/summary${dashboardQuery(filters)}`, {}, token);
  },
  getCompanies(filters: DashboardFilters, token: string) {
    return request<PaginatedResponse<DashboardCompanyListItem>>(
      `/dashboard/companies${dashboardQuery(filters)}`,
      {},
      token,
    );
  },
  getCompanyDetail(empresaId: string, filters: DashboardFilters, token: string) {
    return request<CompanyDetailResponse>(
      `/dashboard/companies/${empresaId}${dashboardQuery(filters)}`,
      {},
      token,
    );
  },
  getCidSummary(filters: CidDashboardFilters, token: string) {
    return request<CidDashboardSummary>(`/dashboard/cid/summary${dashboardQuery(filters)}`, {}, token);
  },
  getCompanyCidRows(filters: CidDashboardFilters, token: string) {
    return request<PaginatedResponse<CompanyCidListItem>>(
      `/dashboard/cid/company-cid${dashboardQuery(filters)}`,
      {},
      token,
    );
  },
  getBeneficiarios(filters: DashboardFilters, token: string) {
    return request<PaginatedResponse<CompanyDetailResponse["beneficiaries"]["data"][number]>>(
      `/beneficiarios${dashboardQuery(filters)}`,
      {},
      token,
    );
  },
  getUsers(token: string) {
    return request<UserListItem[]>("/users", {}, token);
  },
  createUser(input: CreateUserInput, token: string) {
    return request<UserListItem>("/users", { method: "POST", body: JSON.stringify(input) }, token);
  },
  async downloadReport(filters: DashboardFilters, token: string) {
    const response = await fetch(`${API_BASE_URL}/exports/dashboard.pdf${dashboardQuery(filters)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new ApiError("Nao foi possivel gerar o PDF.", response.status);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dashboard-beneficiarios.pdf";
    link.click();
    window.URL.revokeObjectURL(url);
  },
  searchCidCompanies(query: string, token: string) {
    return request<CompanySearchItem[]>(`/dashboard/cid/companies-search?q=${encodeURIComponent(query)}`, {}, token);
  },
  // --- CID Explorer drill-down ---
  getExplorerCompanies(token: string) {
    return request<CidExplorerCompanyRow[]>("/dashboard/cid/explorer/companies", {}, token);
  },
  getExplorerCids(token: string) {
    return request<CidExplorerCidRow[]>("/dashboard/cid/explorer/cids", {}, token);
  },
  getCompanyCidDrill(empresaId: number, token: string) {
    return request<CompanyCidDrillResponse>(`/dashboard/cid/explorer/company/${empresaId}`, {}, token);
  },
  getCidCompanyDrill(codigo: string, token: string) {
    return request<CidCompanyDrillResponse>(`/dashboard/cid/explorer/cid/${encodeURIComponent(codigo)}`, {}, token);
  },
  async downloadCidReport(filters: CidDashboardFilters, token: string) {
    const response = await fetch(`${API_BASE_URL}/exports/dashboard-cid.pdf${dashboardQuery(filters)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new ApiError("Nao foi possivel gerar o PDF de Empresa x CID.", response.status);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dashboard-empresa-cid.pdf";
    link.click();
    window.URL.revokeObjectURL(url);
  },
};
