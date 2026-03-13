import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/app-error.js";
import { verifyAuthToken } from "../lib/jwt.js";
import { getAuthenticatedUser } from "../services/auth-service.js";

function getBearerToken(req: Request) {
  const header = req.headers.authorization;
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      throw new AppError(401, "Token de acesso ausente.");
    }

    const payload = verifyAuthToken(token);
    const user = await getAuthenticatedUser(payload.sub, payload.sessionId);
    req.user = { ...user, sessionId: payload.sessionId };
    next();
  } catch (error) {
    next(error);
  }
}
