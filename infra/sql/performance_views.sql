-- =============================================================================
-- OPTIMIZED MATERIALIZED VIEWS FOR CID DASHBOARD
-- =============================================================================
-- Target: PostgreSQL 14+
-- These views pre-compute the expensive JOIN between cad_plano_benef and
-- diagnostics (which involves regexp_replace + cast on every row).
-- They should be refreshed periodically via the refresh script.
--
-- NOTE: DROP + CREATE is used because CREATE MATERIALIZED VIEW IF NOT EXISTS
--       does not update the definition if the view already exists with
--       different SQL. In production, coordinate the refresh to avoid
--       serving stale data during the brief window between DROP and CREATE.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Prerequisite: ensure the expression index exists on diagnostics
-- ---------------------------------------------------------------------------
-- The materialized view creation query itself benefits from the expression index.
-- If you haven't run performance_indexes.sql yet, do so first.

-- ---------------------------------------------------------------------------
-- 1. mv_cid_company_cid_agg
-- ---------------------------------------------------------------------------
-- Pre-aggregated: one row per (empresa, CID code).
-- Used by: getCachedCidDashboardSummary (top CIDs), listCachedCompanyCidRows.
-- This avoids the expensive JOIN + regexp on every dashboard page load.

DROP MATERIALIZED VIEW IF EXISTS public.mv_cid_company_cid_agg CASCADE;

CREATE MATERIALIZED VIEW public.mv_cid_company_cid_agg AS
SELECT
    b.empresa::int                                              AS empresa_id,
    MAX(b.nome)::text                                           AS empresa_nome,
    COALESCE(NULLIF(d."Codigo", ''), 'SEM_CID')::text          AS codigo,
    MAX(COALESCE(
        NULLIF(d."DescricaoCID", ''),
        NULLIF(d."Cid", ''),
        'CID sem descricao'
    ))::text                                                    AS descricao,
    COUNT(*)::int                                               AS total_diagnosticos,
    COUNT(DISTINCT b.matricula_pep)::int                        AS total_pacientes,
    MAX(to_timestamp(d."DataHora", 'DD/MM/YYYY HH24:MI'))      AS last_diagnosis_at
FROM cad_plano_benef b
JOIN diagnostics d
    ON NULLIF(regexp_replace(d."PacienteID", '[^0-9]', '', 'g'), '')::numeric = b.matricula_pep
WHERE b.matricula_pep IS NOT NULL
    AND NULLIF(regexp_replace(d."PacienteID", '[^0-9]', '', 'g'), '') IS NOT NULL
    AND d."DataHora" IS NOT NULL
GROUP BY b.empresa, COALESCE(NULLIF(d."Codigo", ''), 'SEM_CID')
WITH DATA;

-- Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_cid_company_cid_agg_unique
    ON public.mv_cid_company_cid_agg (empresa_id, codigo);

-- Sort index for paginated listing (ORDER BY total_diagnosticos DESC is default)
CREATE INDEX IF NOT EXISTS idx_mv_cid_company_cid_agg_sort
    ON public.mv_cid_company_cid_agg (total_diagnosticos DESC, empresa_nome, codigo);

-- Lookup by empresa for company drill-downs from cached data
CREATE INDEX IF NOT EXISTS idx_mv_cid_company_cid_agg_empresa
    ON public.mv_cid_company_cid_agg (empresa_id);

-- Lookup by CID code for top-CID aggregations
CREATE INDEX IF NOT EXISTS idx_mv_cid_company_cid_agg_codigo
    ON public.mv_cid_company_cid_agg (codigo);

-- Composite for the top CIDs query: GROUP BY codigo ORDER BY SUM(total_diagnosticos) DESC
CREATE INDEX IF NOT EXISTS idx_mv_cid_company_cid_agg_codigo_diag
    ON public.mv_cid_company_cid_agg (codigo, total_diagnosticos DESC);

-- Covering index for common sort columns used in listCachedCompanyCidRows
CREATE INDEX IF NOT EXISTS idx_mv_cid_company_cid_agg_sort_pacientes
    ON public.mv_cid_company_cid_agg (total_pacientes DESC, empresa_nome, codigo);

CREATE INDEX IF NOT EXISTS idx_mv_cid_company_cid_agg_sort_last_diag
    ON public.mv_cid_company_cid_agg (last_diagnosis_at DESC NULLS LAST, empresa_nome, codigo);

-- ---------------------------------------------------------------------------
-- 2. mv_cid_dashboard_overview
-- ---------------------------------------------------------------------------
-- Single-row summary of the entire CID dataset.
-- Used by: getCachedCidDashboardSummary (the summary card).
-- Avoids re-computing the full JOIN just to show totals on the dashboard.

DROP MATERIALIZED VIEW IF EXISTS public.mv_cid_dashboard_overview CASCADE;

CREATE MATERIALIZED VIEW public.mv_cid_dashboard_overview AS
SELECT
    COUNT(*)::int                                               AS total_diagnosticos,
    COUNT(DISTINCT b.empresa)::int                              AS total_empresas,
    COUNT(DISTINCT COALESCE(NULLIF(d."Codigo", ''), 'SEM_CID'))::int AS total_cids,
    COUNT(DISTINCT b.matricula_pep)::int                        AS total_pacientes,
    MAX(to_timestamp(d."DataHora", 'DD/MM/YYYY HH24:MI'))      AS latest_diagnosis_at
FROM cad_plano_benef b
JOIN diagnostics d
    ON NULLIF(regexp_replace(d."PacienteID", '[^0-9]', '', 'g'), '')::numeric = b.matricula_pep
WHERE b.matricula_pep IS NOT NULL
    AND NULLIF(regexp_replace(d."PacienteID", '[^0-9]', '', 'g'), '') IS NOT NULL
    AND d."DataHora" IS NOT NULL
WITH DATA;

-- Unique index to allow CONCURRENTLY refresh (single-row, use a constant)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_cid_dashboard_overview_unique
    ON public.mv_cid_dashboard_overview (total_diagnosticos, total_empresas);

-- ---------------------------------------------------------------------------
-- 3. mv_cid_explorer_companies (NEW)
-- ---------------------------------------------------------------------------
-- Pre-aggregated: one row per empresa with diagnostics totals.
-- Used by: listExplorerCompanies (top 30 companies by diagnostics).
-- Currently this query runs the full JOIN every time; caching it here
-- makes the explorer page load instantly.

DROP MATERIALIZED VIEW IF EXISTS public.mv_cid_explorer_companies CASCADE;

CREATE MATERIALIZED VIEW public.mv_cid_explorer_companies AS
SELECT
    b.empresa::int                                              AS empresa_id,
    MAX(b.nome)::text                                           AS empresa_nome,
    COUNT(*)::int                                               AS total_diagnosticos,
    COUNT(DISTINCT COALESCE(NULLIF(d."Codigo", ''), 'SEM_CID'))::int AS total_cids_distintos,
    COUNT(DISTINCT b.matricula_pep)::int                        AS total_pacientes
FROM cad_plano_benef b
JOIN diagnostics d
    ON NULLIF(regexp_replace(d."PacienteID", '[^0-9]', '', 'g'), '')::numeric = b.matricula_pep
WHERE b.matricula_pep IS NOT NULL
    AND NULLIF(regexp_replace(d."PacienteID", '[^0-9]', '', 'g'), '') IS NOT NULL
    AND d."DataHora" IS NOT NULL
GROUP BY b.empresa
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_cid_explorer_companies_unique
    ON public.mv_cid_explorer_companies (empresa_id);

CREATE INDEX IF NOT EXISTS idx_mv_cid_explorer_companies_sort
    ON public.mv_cid_explorer_companies (total_diagnosticos DESC);

-- ---------------------------------------------------------------------------
-- 4. mv_cid_explorer_cids (NEW)
-- ---------------------------------------------------------------------------
-- Pre-aggregated: one row per CID code with diagnostics totals.
-- Used by: listExplorerCids (top 30 CIDs by diagnostics).
-- Same rationale as above.

DROP MATERIALIZED VIEW IF EXISTS public.mv_cid_explorer_cids CASCADE;

CREATE MATERIALIZED VIEW public.mv_cid_explorer_cids AS
SELECT
    COALESCE(NULLIF(d."Codigo", ''), 'SEM_CID')::text          AS codigo,
    MAX(COALESCE(
        NULLIF(d."DescricaoCID", ''),
        NULLIF(d."Cid", ''),
        'CID sem descricao'
    ))::text                                                    AS descricao,
    COUNT(*)::int                                               AS total_diagnosticos,
    COUNT(DISTINCT b.empresa)::int                              AS total_empresas,
    COUNT(DISTINCT b.matricula_pep)::int                        AS total_pacientes
FROM cad_plano_benef b
JOIN diagnostics d
    ON NULLIF(regexp_replace(d."PacienteID", '[^0-9]', '', 'g'), '')::numeric = b.matricula_pep
WHERE b.matricula_pep IS NOT NULL
    AND NULLIF(regexp_replace(d."PacienteID", '[^0-9]', '', 'g'), '') IS NOT NULL
    AND d."DataHora" IS NOT NULL
GROUP BY COALESCE(NULLIF(d."Codigo", ''), 'SEM_CID')
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_cid_explorer_cids_unique
    ON public.mv_cid_explorer_cids (codigo);

CREATE INDEX IF NOT EXISTS idx_mv_cid_explorer_cids_sort
    ON public.mv_cid_explorer_cids (total_diagnosticos DESC);

-- ---------------------------------------------------------------------------
-- 5. REFRESH STATISTICS
-- ---------------------------------------------------------------------------
ANALYZE mv_cid_company_cid_agg;
ANALYZE mv_cid_dashboard_overview;
ANALYZE mv_cid_explorer_companies;
ANALYZE mv_cid_explorer_cids;
