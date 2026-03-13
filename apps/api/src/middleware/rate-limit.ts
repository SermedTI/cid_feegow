import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/app-error.js";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}, 60_000);

export function rateLimit(options: { windowMs: number; max: number; keyPrefix?: string }) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const key = `${options.keyPrefix ?? "rl"}:${ip}`;
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + options.windowMs };
      store.set(key, entry);
    }

    entry.count++;

    if (entry.count > options.max) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      return next(
        new AppError(429, `Muitas tentativas. Tente novamente em ${retryAfterSeconds}s.`)
      );
    }

    next();
  };
}
