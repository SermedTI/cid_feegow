#!/usr/bin/env bash
set -euo pipefail

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log "=== Daily pipeline started ==="

log "Step 1/2: Running incremental diagnostics update (Python)..."
python3 /app/scripts_python/update_diagnostics_incremental.py
log "Step 1/2: Diagnostics update completed."

log "Step 2/2: Refreshing CID dashboard materialized views (Node)..."
node /app/apps/api/dist/scripts/refresh-cid-dashboard-cache.js
log "Step 2/2: Materialized views refreshed."

log "=== Daily pipeline finished ==="
