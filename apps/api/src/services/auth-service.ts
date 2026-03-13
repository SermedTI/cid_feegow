import type { AuthLoginResponse, AuthUser } from "@andre/shared";
import { z } from "zod";
import { AppError } from "../lib/app-error.js";
import { createSessionId, signAuthToken } from "../lib/jwt.js";
import { verifyPassword } from "../lib/password.js";
import {
  findActiveSession,
  findUserByEmail,
  findUserById,
  insertAuditLog,
  insertSession,
  revokeSession,
  touchLastLogin,
} from "../db/queries/auth.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

function mapUser(user: Awaited<ReturnType<typeof findUserById>> extends infer T ? Exclude<T, null> : never): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.is_active,
    createdAt: user.created_at.toISOString(),
    updatedAt: user.updated_at.toISOString(),
    lastLoginAt: user.last_login_at ? user.last_login_at.toISOString() : null,
  };
}

function parseExpiry(expiresIn: string) {
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) {
    return new Date(Date.now() + 8 * 60 * 60 * 1000);
  }

  const value = Number(match[1]);
  const multiplier = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2] as "s" | "m" | "h" | "d"];
  return new Date(Date.now() + value * multiplier);
}

export async function login(input: unknown, jwtExpiresIn: string): Promise<AuthLoginResponse> {
  const payload = loginSchema.parse(input);
  const user = await findUserByEmail(payload.email);

  if (!user || !user.is_active) {
    throw new AppError(401, "Credenciais invalidas.");
  }

  const passwordOk = await verifyPassword(payload.password, user.password_hash);
  if (!passwordOk) {
    throw new AppError(401, "Credenciais invalidas.");
  }

  const sessionId = createSessionId();
  const expiresAt = parseExpiry(jwtExpiresIn);
  await insertSession(user.id, sessionId, expiresAt);
  await touchLastLogin(user.id);
  await insertAuditLog(user.id, "auth.login", { email: user.email });

  const accessToken = signAuthToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    sessionId,
  });

  const freshUser = await findUserById(user.id);
  if (!freshUser) {
    throw new AppError(500, "Usuario autenticado nao encontrado apos login.");
  }

  return { accessToken, user: mapUser(freshUser) };
}

export async function getAuthenticatedUser(userId: string, sessionId: string) {
  const [user, session] = await Promise.all([findUserById(userId), findActiveSession(userId, sessionId)]);

  if (!user || !user.is_active || !session) {
    throw new AppError(401, "Sessao expirada ou invalida.");
  }

  return mapUser(user);
}

export async function logout(userId: string, sessionId: string) {
  await revokeSession(userId, sessionId);
  await insertAuditLog(userId, "auth.logout", {});
}
