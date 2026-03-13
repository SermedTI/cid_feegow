import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

for (const candidate of [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env"),
  resolve(process.cwd(), "apps/api/.env")
]) {
  if (existsSync(candidate)) {
    config({ path: candidate, override: false });
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3333),
  APP_ORIGIN: z.string().default("http://localhost:5175"),
  APP_ORIGINS: z.string().optional(),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters. Set it in your .env file."),
  JWT_EXPIRES_IN: z.string().default("8h"),
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_LOGIN_WINDOW_MS: z.coerce.number().int().positive().default(900000),
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  APP_ORIGINS: parsedEnv.APP_ORIGINS
    ? parsedEnv.APP_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
    : [],
};
