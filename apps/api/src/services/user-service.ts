import type { CreateUserInput, UpdateUserInput, UserListItem } from "@andre/shared";
import { z } from "zod";
import { AppError } from "../lib/app-error.js";
import { hashPassword } from "../lib/password.js";
import {
  countActiveAdmins,
  createUser,
  findUserByEmail,
  findUserById,
  insertAuditLog,
  listUsers,
  updateUser,
} from "../db/queries/auth.js";

const uuidSchema = z.string().uuid("ID de usuario invalido.");

const createUserSchema = z.object({
  name: z.string().trim().min(3).max(120),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "reader"]),
});

const updateUserSchema = z.object({
  name: z.string().trim().min(3).max(120).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(["admin", "reader"]).optional(),
  isActive: z.boolean().optional(),
});

function mapUser(user: Awaited<ReturnType<typeof findUserById>> extends infer T ? Exclude<T, null> : never): UserListItem {
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

async function ensureNotLastAdmin(userId: string, isDeactivating: boolean, isChangingRole: boolean) {
  if (!isDeactivating && !isChangingRole) return;

  const existing = await findUserById(userId);
  if (!existing || existing.role !== "admin") return;

  const adminCount = await countActiveAdmins();
  if (adminCount <= 1) {
    throw new AppError(422, "Nao e possivel desativar ou rebaixar o unico administrador ativo.");
  }
}

export const userService = {
  async list() {
    const users = await listUsers();
    return users.map(mapUser);
  },

  async create(input: CreateUserInput, actorUserId: string) {
    const payload = createUserSchema.parse(input);
    const existing = await findUserByEmail(payload.email);
    if (existing) {
      throw new AppError(409, "Ja existe usuario com este email.");
    }

    const passwordHash = await hashPassword(payload.password);
    const user = await createUser({
      name: payload.name,
      email: payload.email,
      passwordHash,
      role: payload.role,
    });

    await insertAuditLog(actorUserId, "users.create", { createdUserId: user.id, email: user.email, role: user.role });
    return mapUser(user);
  },

  async update(userId: string, input: UpdateUserInput, actorUserId: string) {
    uuidSchema.parse(userId);
    const payload = updateUserSchema.parse(input);

    const existing = await findUserById(userId);
    if (!existing) {
      throw new AppError(404, "Usuario nao encontrado.");
    }

    const isDeactivating = payload.isActive === false && existing.is_active;
    const isChangingRole = payload.role !== undefined && payload.role !== existing.role && existing.role === "admin";
    await ensureNotLastAdmin(userId, isDeactivating, isChangingRole);

    if (payload.email && payload.email.toLowerCase() !== existing.email.toLowerCase()) {
      const duplicate = await findUserByEmail(payload.email);
      if (duplicate) {
        throw new AppError(409, "Ja existe usuario com este email.");
      }
    }

    const passwordHash = payload.password ? await hashPassword(payload.password) : undefined;
    const user = await updateUser(userId, {
      name: payload.name,
      email: payload.email,
      passwordHash,
      role: payload.role,
      isActive: payload.isActive,
    });

    if (!user) {
      throw new AppError(404, "Usuario nao encontrado apos atualizacao.");
    }

    await insertAuditLog(actorUserId, "users.update", { targetUserId: user.id });
    return mapUser(user);
  },
};
