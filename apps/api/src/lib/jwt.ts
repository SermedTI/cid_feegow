import { randomUUID } from "node:crypto";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import type { UserRole } from "@andre/shared";

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  sessionId: string;
}

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload & JwtPayload;
}

export function createSessionId() {
  return randomUUID();
}
