import { Router } from "express";
import { env } from "../config/env.js";
import { AppError } from "../lib/app-error.js";
import { requireAuth } from "../middleware/require-auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { login, logout } from "../services/auth-service.js";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_LOGIN_WINDOW_MS,
  max: env.RATE_LIMIT_LOGIN_MAX,
  keyPrefix: "login",
});

authRouter.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const result = await login(req.body, env.JWT_EXPIRES_IN);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, "Nao autenticado.");
    }

    const { sessionId, ...user } = req.user;
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, "Nao autenticado.");
    }

    await logout(req.user.id, req.user.sessionId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
