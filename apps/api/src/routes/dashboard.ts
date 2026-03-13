import { Router } from "express";
import { z } from "zod";
import { parseCidDashboardFilters, parseDashboardFilters, dashboardService } from "../services/dashboard-service.js";
import { getCompanyCidDrill, getCidCompanyDrill, listExplorerCompanies, listExplorerCids, searchCompanies } from "../db/queries/cid-explorer.js";

export const dashboardRouter = Router();

const companyIdSchema = z.coerce.number().int().positive();
const cidCodigoSchema = z.string().trim().min(1).max(20);

dashboardRouter.get("/summary", async (req, res, next) => {
  try {
    const filters = parseDashboardFilters(req.query);
    const summary = await dashboardService.getSummary(filters);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/companies", async (req, res, next) => {
  try {
    const filters = parseDashboardFilters(req.query);
    const companies = await dashboardService.listCompanies(filters);
    res.json(companies);
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/companies/:empresaId", async (req, res, next) => {
  try {
    const empresaId = companyIdSchema.parse(req.params.empresaId);
    const filters = parseDashboardFilters(req.query);
    const detail = await dashboardService.getCompanyDetail(empresaId, filters);
    res.json(detail);
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/cid/summary", async (req, res, next) => {
  try {
    const filters = parseCidDashboardFilters(req.query);
    const summary = await dashboardService.getCidSummary(filters);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/cid/company-cid", async (req, res, next) => {
  try {
    const filters = parseCidDashboardFilters(req.query);
    const rows = await dashboardService.listCompanyCidRows(filters);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/cid/companies-search", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (q.length < 2) {
      res.json([]);
      return;
    }
    const results = await searchCompanies(q);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

// --- CID Explorer drill-down endpoints ---

dashboardRouter.get("/cid/explorer/companies", async (_req, res, next) => {
  try {
    const companies = await listExplorerCompanies();
    res.json(companies);
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/cid/explorer/cids", async (_req, res, next) => {
  try {
    const cids = await listExplorerCids();
    res.json(cids);
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/cid/explorer/company/:empresaId", async (req, res, next) => {
  try {
    const empresaId = companyIdSchema.parse(req.params.empresaId);
    const detail = await getCompanyCidDrill(empresaId);
    res.json(detail);
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/cid/explorer/cid/:codigo", async (req, res, next) => {
  try {
    const codigo = cidCodigoSchema.parse(req.params.codigo);
    const detail = await getCidCompanyDrill(codigo);
    res.json(detail);
  } catch (error) {
    next(error);
  }
});
