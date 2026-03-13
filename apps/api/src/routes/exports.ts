import { Router } from "express";
import { parseCidDashboardFilters, parseDashboardFilters } from "../services/dashboard-service.js";
import { buildCidDashboardPdf } from "../lib/cid-dashboard-pdf.js";
import { buildDashboardPdf } from "../lib/dashboard-pdf.js";
import { insertAuditLog } from "../db/queries/auth.js";
import { AppError } from "../lib/app-error.js";

export const exportsRouter = Router();

exportsRouter.get("/dashboard.pdf", async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, "Nao autenticado.");
    }

    const filters = parseDashboardFilters(req.query);
    const pdf = await buildDashboardPdf(filters);
    await insertAuditLog(req.user.id, "exports.dashboard_pdf", filters as Record<string, unknown>);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="dashboard-beneficiarios.pdf"');
    res.send(pdf);
  } catch (error) {
    next(error);
  }
});

exportsRouter.get("/dashboard-cid.pdf", async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, "Nao autenticado.");
    }

    const filters = parseCidDashboardFilters(req.query);
    const pdf = await buildCidDashboardPdf(filters);
    await insertAuditLog(req.user.id, "exports.dashboard_cid_pdf", filters as Record<string, unknown>);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="dashboard-empresa-cid.pdf"');
    res.send(pdf);
  } catch (error) {
    next(error);
  }
});
