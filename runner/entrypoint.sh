#!/usr/bin/env bash
set -euo pipefail

if [ -z "${RUNNER_JITCONFIG:-}" ]; then
  echo "RUNNER_JITCONFIG env var not set" >&2
  exit 1
fi

cd /home/runner
exec ./run.sh --jitconfig "$RUNNER_JITCONFIG"
