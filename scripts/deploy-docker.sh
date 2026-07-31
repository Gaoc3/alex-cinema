#!/bin/sh
set -eu

project_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$project_dir"

env_file="${APP_ENV_FILE:-.env.docker}"
if [ ! -s "$env_file" ]; then
  echo "Missing $env_file. Run scripts/prepare-docker.sh and fill all values." >&2
  exit 1
fi

if grep -q 'CHANGE_ME' "$env_file"; then
  echo "$env_file still contains CHANGE_ME placeholders." >&2
  exit 1
fi

compose() {
  docker compose --env-file "$env_file" "$@"
}

compose config --quiet

if compose ps --status running --services 2>/dev/null | grep -qx postgres; then
  compose --profile ops run --rm db-backup
fi

compose build --pull
compose up -d --remove-orphans --wait
compose ps

echo "Deployment completed. Public readiness: ${APP_ORIGIN:-see APP_ORIGIN in $env_file}/healthz"
