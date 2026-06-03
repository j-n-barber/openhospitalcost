#!/usr/bin/env bash
# Complete-coverage sweep: reach the gettable small-hospital tail the earlier
# runs never got to (crash + account-switch kills + time lost on the hard top
# cluster). --no-tier2 so blocked/dead big names fail fast; --timeout 300 is
# enough for the larger vendor CSVs (para-hcfs 58 MB, craneware 49 MB) while
# still aborting truly-hung downloads. Loops to auto-resume; launched DETACHED
# (spawn detached) so Claude session/account changes don't kill it.
set -u
cd /Users/jakebarber/Documents/JNBARBER/Projects/OpenHospitalCost
for i in $(seq 1 10); do
  echo "===== SWEEP PASS $i started $(date) ====="
  npm run ingest:batch -- --tier 3 --limit 5000 --no-tier2 --no-archive --timeout 300 --order asc
  code=$?
  echo "===== PASS $i exit=$code $(date) ====="
  [ "$code" -eq 0 ] && { echo "clean completion"; break; }
  echo "non-zero exit — resuming in 20s"; sleep 20
done
echo "===== SWEEP COMPLETE $(date) ====="
