#!/usr/bin/env bash
# Group-A "patient pass": after the fast small-first sweep finishes, give the
# large-but-downloadable hospitals (Cleveland 1.5 GB, big vendor CSVs, etc.) an
# uninterrupted shot — Tier-2 ON, long 20-min timeout, biggest-first. Group-B
# hospitals (giant JSON / 404 / SPA) still fail fast and wait for code fixes.
# Launched DETACHED so it survives session/account changes.
set -u
cd /Users/jakebarber/Documents/JNBARBER/Projects/OpenHospitalCost

echo "patient pass: waiting for the fast sweep to finish... $(date)"
# Wait until the fast small-first sweep is no longer running.
while pgrep -f "run-recovery.sh" >/dev/null 2>&1; do sleep 60; done
echo "fast sweep done — starting patient pass $(date)"

for i in $(seq 1 6); do
  echo "===== PATIENT PASS $i started $(date) ====="
  npm run ingest:batch -- --tier 3 --limit 5000 --no-archive --timeout 1200 --order desc
  code=$?
  echo "===== PATIENT PASS $i exit=$code $(date) ====="
  [ "$code" -eq 0 ] && { echo "clean completion"; break; }
  echo "non-zero exit — resuming in 30s"; sleep 30
done
echo "===== PATIENT PASS COMPLETE $(date) ====="
