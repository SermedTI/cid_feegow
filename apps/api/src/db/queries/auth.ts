import type { QueryResultRow } from "pg";
import { pool } from "../pool.js";

export interface UserRecord extends QueryResultRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: "admin" | "reader";
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface SessionRecord extends QueryResultRow {
  id: string;
  user_id: string;
  token_id: string;
  revoked_at: Date | null;
  expires_at: Date;
  created_at: Date;
}

const USER_COLUMNS = `id, name, email, role, is_active, last_login_at, created_at, updated_at`;
const USER_COLUMNS_WITH_HASH = `${USER_COLUMNS}, password_hash`;

export async function findUserByEmail(email: string) {
  const result = await pool.query<UserRecord>(
    `
      SELECT ${USER_COLUMNS_WITH_HASH}
      FROM app_users
      WHERE lower(email) = lower($1)
      LIMIT 1
    `,
    [email]
  );
  return result.rows[0] ?? null;
}

export async function findUserById(id: string) {
  const result = await pool.query<UserRecord>(
    `
      SELECT ${USER_COLUMNS}
      FROM app_users
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function insertSession(userId: string, tokenId: string, expiresAt: Date) {
  await pool.query(
    `
      INSERT INTO app_auth_sessions (user_id, token_id, expires_at)
      VALUES ($1, $2, $3)
    `,
    [userId, tokenId, expiresAt]
  );
}

export async function findActiveSession(userId: string, tokenId: string) {
  const result = await pool.query<SessionRecord>(
    `
      SELECT id, user_id, token_id, revoked_at, expires_at, created_at
      FROM app_auth_sessions
      WHERE user_id = $1
        AND token_id = $2
        AND revoked_at IS NULL
        AND expires_at > NOW()
      LIMIT 1
    `,
    [userId, tokenId]
  );
  return result.rows[0] ?? null;
}

export async function revokeSession(userId: string, tokenId: string) {
  await pool.query(
    `
      UPDATE app_auth_sessions
      SET revoked_at = NOW()
      WHERE user_id = $1 AND token_id = $2 AND revoked_at IS NULL
    `,
    [userId, tokenId]
  );
}

export async function touchLastLogin(userId: string) {
  await pool.query(`UPDATE app_users SET last_login_at = NOW() WHERE id = $1`, [userId]);
}

export async function insertAuditLog(userId: string | null, action: string, details: Record<string, unknown>) {
  await pool.query(
    `
      INSERT INTO app_audit_logs (user_id, action, details)
      VALUES ($1, $2, $3::jsonb)
    `,
    [userId, action, JSON.stringify(details)]
  );
}

export async function createUser(params: {
  name: string;
  email: string;
  passwordHash: string;
  role: "admin" | "reader";
}) {
  const result = await pool.query<UserRecord>(
    `
      INSERT INTO app_users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING ${USER_COLUMNS}
    `,
    [params.name, params.email, params.passwordHash, params.role]
  );

  return result.rows[0];
}

export async function listUsers() {
  const result = await pool.query<UserRecord>(
    `
      SELECT ${USER_COLUMNS}
      FROM app_users
      ORDER BY created_at DESC
    `
  );
  return result.rows;
}

const UPDATE_COLUMN_MAP: Record<string, string> = {
  name: "name",
  email: "email",
  passwordHash: "password_hash",
  role: "role",
  isActive: "is_active",
};

export async function updateUser(
  userId: string,
  params: { name?: string; email?: string; passwordHash?: string; role?: "admin" | "reader"; isActive?: boolean }
) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return findUserById(userId);
  }

  const fields = entries.map(([key], index) => {
    const column = UPDATE_COLUMN_MAP[key];
    if (!column) {
      throw new Error(`Unknown update field: ${key}`);
    }
    return `${column} = $${index + 2}`;
  });
  const values = entries.map(([, value]) => value);

  const result = await pool.query<UserRecord>(
    `
      UPDATE app_users
      SET ${fields.join(", ")}
      WHERE id = $1
      RETURNING ${USER_COLUMNS}
    `,
    [userId, ...values]
  );

  return result.rows[0] ?? null;
}

export async function countActiveAdmins() {
  const result = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM app_users WHERE role = 'admin' AND is_active = TRUE`
  );
  return result.rows[0].count;
}
