import type { Server } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./db/pool.js";

async function ensureAuthSchema() {
  const sqlPath = resolve(process.cwd(), "../../infra/sql/bootstrap_auth.sql");
  const fallbackPath = resolve(process.cwd(), "infra/sql/bootstrap_auth.sql");
  const sql = await readFile(sqlPath).catch(() => readFile(fallbackPath));
  await pool.query(sql.toString());
}

function setupGracefulShutdown(server: Server) {
  let shuttingDown = false;

  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n${signal} received — shutting down gracefully...`);

    server.close(() => {
      console.log("HTTP server closed.");
    });

    try {
      await pool.end();
      console.log("Database pool closed.");
    } catch (error) {
      console.error("Error closing database pool:", error);
    }

    process.exit(0);
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

async function bootstrap() {
  await pool.query("SELECT 1");
  await ensureAuthSchema();

  const app = createApp();
  const server = app.listen(env.PORT, env.HOST, () => {
    console.log(`API running on http://${env.HOST}:${env.PORT}`);
  });

  setupGracefulShutdown(server);
}

bootstrap().catch((error) => {
  console.error("Failed to start API", error);
  process.exit(1);
});
