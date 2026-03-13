import { Router } from "express";
import { parseDashboardFilters, dashboardService } from "../services/dashboard-service.js";

export const beneficiariosRouter = Router();

beneficiariosRouter.get("/", async (req, res, next) => {
  try {
    const filters = parseDashboardFilters(req.query);
    const result = await dashboardService.listBeneficiarios(filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
});
