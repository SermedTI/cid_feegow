import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@andre/shared";
import { AppError } from "../lib/app-error.js";

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, "Nao autenticado."));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, "Sem permissao para acessar este recurso."));
    }

    next();
  };
}
