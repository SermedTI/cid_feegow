import type { AuthUser } from "@andre/shared";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser & { sessionId: string };
    }
  }
}

export {};
