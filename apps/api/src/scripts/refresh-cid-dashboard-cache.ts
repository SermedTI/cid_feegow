import { pool } from "../db/pool.js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function loadSql(filename: string) {
  const paths = [
    resolve(process.cwd(), `../../infra/sql/${filename}`),
    resolve(process.cwd(), `infra/sql/${filename}`),
  ];
  for (const p of paths) {
    try {
      return (await readFile(p)).toString();
    } catch {
      // try next path
    }
  }
  throw new Error(`Could not find ${filename} in any expected location`);
}

async function refreshMaterializedView(name: string, concurrently: boolean) {
  const keyword = concurrently ? "CONCURRENTLY" : "";
  await pool.query(`REFRESH MATERIALIZED VIEW ${keyword} ${name}`);
}

async function viewExists(name: string) {
  const result = await pool.query(
    `SELECT EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = $1) AS exists`,
    [name],
  );
  return Boolean(result.rows[0]?.exists);
}

async function main() {
  const startTime = Date.now();
  console.log("Starting CID dashboard cache refresh...");

  // Create views + indexes from performance_views.sql if not yet applied
  console.log("  Ensuring materialized views exist...");
  const viewsSql = await loadSql("performance_views.sql");
  await pool.query(viewsSql);

  // Refresh all views
  const views = [
    { name: "mv_cid_company_cid_agg", hasUnique: true },
    { name: "mv_cid_dashboard_overview", hasUnique: true },
    { name: "mv_cid_explorer_companies", hasUnique: true },
    { name: "mv_cid_explorer_cids", hasUnique: true },
  ];

  for (const view of views) {
    const exists = await viewExists(view.name);
    if (!exists) {
      console.log(`  Skipping ${view.name} (not found)`);
      continue;
    }
    console.log(`  Refreshing ${view.name}${view.hasUnique ? " (CONCURRENTLY)" : ""}...`);
    await refreshMaterializedView(`public.${view.name}`, view.hasUnique);
  }

  // Refresh statistics
  console.log("  Updating statistics...");
  for (const view of views) {
    const exists = await viewExists(view.name);
    if (exists) {
      await pool.query(`ANALYZE public.${view.name}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`CID dashboard cache refreshed in ${elapsed}s.`);
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error) => {
    console.error("Cache refresh failed:", error);
    await pool.end();
    process.exit(1);
  });
