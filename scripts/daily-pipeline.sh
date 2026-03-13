#!/bin/sh
set -euo pipefail

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log "=== Daily pipeline started ==="

log "Step 1/3: Syncing cad_plano_benef from Oracle (Python)..."
python3 /app/scripts_python/sync_cad_plano_benef.py
log "Step 1/3: cad_plano_benef sync completed."

log "Step 2/3: Running incremental diagnostics update (Python)..."
python3 /app/scripts_python/update_diagnostics_incremental.py
log "Step 2/3: Diagnostics update completed."

log "Step 3/3: Refreshing CID dashboard materialized views (Node)..."
node /app/apps/api/dist/scripts/refresh-cid-dashboard-cache.js
log "Step 3/3: Materialized views refreshed."

log "=== Daily pipeline finished ==="
