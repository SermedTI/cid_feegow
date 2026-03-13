-- =============================================================================
-- PERFORMANCE INDEXES MIGRATION
-- =============================================================================
-- Target: PostgreSQL 14+
-- Idempotent: all statements use IF NOT EXISTS
-- NOTE: CREATE INDEX CONCURRENTLY cannot run inside a transaction block.
--       Run this script with psql outside a transaction, or remove CONCURRENTLY
--       if running inside a migration framework that wraps in BEGIN/COMMIT.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------------
-- pg_trgm enables GIN trigram indexes for fast ILIKE '%...%' pattern matching.
-- Without this, ILIKE on 1M+ rows forces a full sequential scan.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================================
-- 1. TABLE: cad_plano_benef  (main table, 1M+ rows)
-- =============================================================================

-- 1a. Index on empresa (used in WHERE empresa = $1, GROUP BY empresa)
-- Covers: dashboard summary filtered by empresa, company detail, company drill,
--         listCompanies filtered, getCompanyDetail, getCompanyCidDrill
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cpb_empresa
    ON cad_plano_benef (empresa);

-- 1b. Trigram GIN index on nome (used in WHERE nome ILIKE '%...%')
-- A btree index cannot help with leading-wildcard ILIKE. The pg_trgm GIN
-- index makes '%pattern%' searches use an index scan instead of seq scan.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cpb_nome_trgm
    ON cad_plano_benef USING gin (nome gin_trgm_ops);

-- 1c. Index on matricula (used in WHERE matricula = $1)
-- Covers: beneficiario lookup by matricula
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cpb_matricula
    ON cad_plano_benef (matricula);

-- 1d. Index on matricula_pep (used in JOIN with diagnostics, WHERE matricula_pep = $1)
-- This is CRITICAL for the JOIN: diagnostics.PacienteID -> cad_plano_benef.matricula_pep
-- Also covers direct filter by matriculaPep.
-- Excludes NULLs since all CID queries have WHERE b.matricula_pep IS NOT NULL.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cpb_matricula_pep
    ON cad_plano_benef (matricula_pep)
    WHERE matricula_pep IS NOT NULL;

-- 1e. Index on titular (used in WHERE titular = $1)
-- Covers: filter by titular in dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cpb_titular
    ON cad_plano_benef (titular);

-- 1f. Composite index for ORDER BY nome, matricula (beneficiarios listing)
-- Covers: listBeneficiarios ORDER BY nome ASC, matricula ASC with pagination.
-- For filtered queries (e.g., WHERE empresa = $1 ORDER BY nome, matricula),
-- the planner can combine idx_cpb_empresa with a sort, or use this for
-- unfiltered scans.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cpb_nome_matricula
    ON cad_plano_benef (nome, matricula);

-- 1g. Composite index for empresa + matricula_pep (CID dashboard JOIN with empresa filter)
-- When queries filter by empresa AND join on matricula_pep, this composite index
-- lets PostgreSQL seek on empresa first, then scan matricula_pep values for the JOIN.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cpb_empresa_matricula_pep
    ON cad_plano_benef (empresa, matricula_pep)
    WHERE matricula_pep IS NOT NULL;

-- =============================================================================
-- 2. TABLE: diagnostics  (joined with cad_plano_benef via PacienteID)
-- =============================================================================

-- 2a. Expression index on the cleaned numeric PacienteID
-- THE BIGGEST BOTTLENECK: the JOIN uses
--   NULLIF(regexp_replace(d."PacienteID", '[^0-9]', '', 'g'), '')::numeric
-- Without an index on this expression, PostgreSQL must compute it for EVERY ROW
-- in diagnostics on every query. This expression index pre-computes and stores
-- the result in a btree, enabling index lookups for the JOIN.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_diag_paciente_id_numeric
    ON diagnostics (
        (NULLIF(regexp_replace("PacienteID", '[^0-9]', '', 'g'), '')::numeric)
    )
    WHERE NULLIF(regexp_replace("PacienteID", '[^0-9]', '', 'g'), '') IS NOT NULL
      AND "DataHora" IS NOT NULL;

-- 2b. Expression index on UPPER(COALESCE(NULLIF("Codigo",''), 'SEM_CID'))
-- Used in: getCidCompanyDrill WHERE UPPER(CID_CODE) = $1
-- Enables index lookup for CID code drill queries instead of sequential scan.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_diag_cid_code_upper
    ON diagnostics (
        UPPER(COALESCE(NULLIF("Codigo", ''), 'SEM_CID'))
    );

-- 2c. Index on Codigo (used in GROUP BY, filtering, and CID code expressions)
-- Useful for aggregation queries that group by CID code.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_diag_codigo
    ON diagnostics ("Codigo");

-- 2d. Index on DataHora (used in WHERE DataHora IS NOT NULL and date range filters)
-- All CID queries require DataHora IS NOT NULL. Date-range filters use a
-- computed sort key, but this index still helps with the IS NOT NULL predicate
-- to skip rows early.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_diag_datahora
    ON diagnostics ("DataHora")
    WHERE "DataHora" IS NOT NULL;

-- 2e. Composite expression index for the full JOIN + filter pattern
-- This covers the most common CID query pattern: join on numeric PacienteID
-- with the CID code for grouping. Allows index-only scan for aggregations.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_diag_paciente_codigo
    ON diagnostics (
        (NULLIF(regexp_replace("PacienteID", '[^0-9]', '', 'g'), '')::numeric),
        COALESCE(NULLIF("Codigo", ''), 'SEM_CID')
    )
    WHERE NULLIF(regexp_replace("PacienteID", '[^0-9]', '', 'g'), '') IS NOT NULL
      AND "DataHora" IS NOT NULL;

-- =============================================================================
-- 3. TABLE: app_users
-- =============================================================================

-- 3a. Index on lower(email) for case-insensitive login lookup
-- Covers: findUserByEmail WHERE lower(email) = lower($1)
-- The UNIQUE constraint on email is case-sensitive; this expression index
-- ensures the case-insensitive lookup is fast.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_app_users_email_lower
    ON app_users (lower(email));

-- 3b. Index for countActiveAdmins (role + is_active filter)
-- Covers: WHERE role = 'admin' AND is_active = TRUE
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_app_users_role_active
    ON app_users (role, is_active)
    WHERE is_active = TRUE;

-- =============================================================================
-- 4. TABLE: app_auth_sessions
-- =============================================================================
-- Existing indexes from bootstrap_auth.sql:
--   idx_app_auth_sessions_user_id ON (user_id)
--   idx_app_auth_sessions_expires_at ON (expires_at)
--   UNIQUE on token_id

-- 4a. Composite index for findActiveSession
-- Covers: WHERE user_id = $1 AND token_id = $2 AND revoked_at IS NULL AND expires_at > NOW()
-- The existing separate indexes on user_id and token_id can't efficiently cover
-- this multi-column predicate. This composite index matches the exact query.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_app_auth_sessions_active_lookup
    ON app_auth_sessions (user_id, token_id)
    WHERE revoked_at IS NULL;

-- 4b. Index for revokeSession
-- Covers: WHERE user_id = $1 AND token_id = $2 AND revoked_at IS NULL (UPDATE)
-- Same index as above covers this pattern as well.

-- =============================================================================
-- 5. TABLE: app_audit_logs
-- =============================================================================
-- Existing index: idx_app_audit_logs_user_id_created_at ON (user_id, created_at DESC)

-- 5a. Index on action for potential filtering by audit action type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_app_audit_logs_action
    ON app_audit_logs (action, created_at DESC);

-- =============================================================================
-- 6. MATERIALIZED VIEW: mv_cid_company_cid_agg
-- =============================================================================
-- These indexes already exist in the refresh script, but we include them here
-- for completeness and to ensure they exist even before the first refresh.

CREATE INDEX IF NOT EXISTS idx_mv_cid_company_cid_agg_sort
    ON mv_cid_company_cid_agg (total_diagnosticos DESC, empresa_nome, codigo);

CREATE INDEX IF NOT EXISTS idx_mv_cid_company_cid_agg_empresa
    ON mv_cid_company_cid_agg (empresa_id);

CREATE INDEX IF NOT EXISTS idx_mv_cid_company_cid_agg_codigo
    ON mv_cid_company_cid_agg (codigo);

-- Additional index for the cached top CIDs query that groups by codigo
-- and orders by SUM(total_diagnosticos)
CREATE INDEX IF NOT EXISTS idx_mv_cid_company_cid_agg_codigo_diag
    ON mv_cid_company_cid_agg (codigo, total_diagnosticos DESC);

-- =============================================================================
-- 7. STATISTICS REFRESH
-- =============================================================================
-- After creating indexes, refresh statistics so the query planner has accurate
-- data about value distribution, row counts, and correlation.
-- This is essential -- new indexes are useless if the planner has stale stats.

ANALYZE cad_plano_benef;
ANALYZE diagnostics;
ANALYZE app_users;
ANALYZE app_auth_sessions;
ANALYZE app_audit_logs;

-- Analyze materialized views only if they exist (they may not on first deploy)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_cid_company_cid_agg') THEN
        ANALYZE mv_cid_company_cid_agg;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_cid_dashboard_overview') THEN
        ANALYZE mv_cid_dashboard_overview;
    END IF;
END
$$;
