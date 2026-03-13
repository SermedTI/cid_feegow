export type UserRole = "admin" | "reader";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
}

export interface AuthLoginInput {
  email: string;
  password: string;
}

export interface AuthLoginResponse {
  accessToken: string;
  user: AuthUser;
}

export type AuthResponse = AuthLoginResponse;

export interface TopCompanyItem {
  empresaId: number;
  nome: string;
  totalBeneficiarios: number;
  totalTitulares: number;
  totalDependentes: number;
}

export type TopCompany = TopCompanyItem;

export interface DashboardSummary {
  totalBeneficiarios: number;
  totalEmpresas: number;
  totalTitulares: number;
  totalDependentes: number;
  totalTitularesDistintos: number;
  totalMatriculasPepDistintas: number;
  averageBeneficiariosPerEmpresa: number;
  topEmpresas: TopCompanyItem[];
}

export interface CompanyInsight {
  empresaId: number;
  nome: string;
  totalBeneficiarios: number;
  totalTitulares: number;
  totalDependentes: number;
  matriculasPepDistintas: number;
  coberturaTitularesPercent: number;
}

export interface BeneficiarioRow {
  empresa: number;
  nome: string;
  matricula: number;
  matriculaPep: number | null;
  titular: number | null;
  isTitular: boolean;
}

export interface DashboardFilters {
  empresa?: string;
  nome?: string;
  matricula?: string;
  matriculaPep?: string;
  titular?: string;
  page?: number;
  pageSize?: number;
  sort?: "empresa" | "nome" | "beneficiarios" | "titulares" | "dependentes";
  order?: "asc" | "desc";
}

export interface CidDashboardFilters {
  empresa?: string;
  cidCodigo?: string;
  descricao?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  sort?: "empresa" | "cid" | "descricao" | "diagnosticos" | "pacientes" | "ultimaData";
  order?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DashboardCompanyListItem extends CompanyInsight {}

export interface CidTopItem {
  codigo: string;
  descricao: string;
  totalDiagnosticos: number;
  totalPacientes: number;
  totalEmpresas: number;
}

export interface CompanyCidListItem {
  empresaId: number;
  empresaNome: string;
  codigo: string;
  descricao: string;
  totalDiagnosticos: number;
  totalPacientes: number;
  lastDiagnosisAt: string | null;
}

export interface CidDashboardSummary {
  totalDiagnosticos: number;
  totalEmpresas: number;
  totalCids: number;
  totalPacientes: number;
  latestDiagnosisAt: string | null;
  topCids: CidTopItem[];
}

export interface CompanyDetailResponse {
  summary: CompanyInsight;
  beneficiaries: PaginatedResponse<BeneficiarioRow>;
}

// --- Empresa x CID drill-down types ---

export interface CompanyCidDrillItem {
  codigo: string;
  descricao: string;
  totalDiagnosticos: number;
  totalPacientes: number;
  lastDiagnosisAt: string | null;
}

export interface CompanyCidDrillResponse {
  empresaId: number;
  empresaNome: string;
  totalDiagnosticos: number;
  totalCidsDistintos: number;
  totalPacientes: number;
  cids: CompanyCidDrillItem[];
}

export interface CidCompanyDrillItem {
  empresaId: number;
  empresaNome: string;
  totalDiagnosticos: number;
  totalPacientes: number;
  lastDiagnosisAt: string | null;
}

export interface CidCompanyDrillResponse {
  codigo: string;
  descricao: string;
  totalDiagnosticos: number;
  totalEmpresas: number;
  totalPacientes: number;
  empresas: CidCompanyDrillItem[];
}

export interface CidExplorerCompanyRow {
  empresaId: number;
  empresaNome: string;
  totalDiagnosticos: number;
  totalCidsDistintos: number;
  totalPacientes: number;
}

export interface CidExplorerCidRow {
  codigo: string;
  descricao: string;
  totalDiagnosticos: number;
  totalEmpresas: number;
  totalPacientes: number;
}

export interface CompanySearchItem {
  empresaId: number;
  empresaNome: string;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  companies: PaginatedResponse<DashboardCompanyListItem>;
}

export interface UserListItem extends AuthUser {
  active: boolean;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
}
