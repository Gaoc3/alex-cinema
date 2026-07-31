#!/bin/sh
set -eu

project_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$project_dir"
env_file="${APP_ENV_FILE:-.env.docker}"

docker compose --env-file "$env_file" --profile ops run --rm db-backup

