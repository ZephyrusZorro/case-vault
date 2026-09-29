#!/usr/bin/env bash
# CaseVault development launcher (Linux/macOS)
# Starts backend (:8000) + frontend dev server (:5173). Ctrl+C stops both.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "CaseVault dev launcher"

(cd "$ROOT/backend" && ../.venv/bin/python -m uvicorn app.main:app --reload --port 8000) &
BACK=$!
(cd "$ROOT/frontend" && npm run dev) &
FRONT=$!

trap 'kill $BACK $FRONT 2>/dev/null' EXIT
echo "Backend : http://localhost:8000  (pid $BACK)"
echo "Frontend: http://localhost:5173  (pid $FRONT)"
wait $FRONT
