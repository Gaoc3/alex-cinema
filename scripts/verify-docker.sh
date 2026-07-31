#!/bin/sh
set -eu

project_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$project_dir"
env_file="${APP_ENV_FILE:-.env.docker}"

docker compose --env-file "$env_file" ps
docker compose --env-file "$env_file" exec -T app \
  node -e "fetch('http://127.0.0.1:3000/api/health').then(async r=>{console.log(r.status,await r.text());if(!r.ok)process.exit(1)}).catch(e=>{console.error(e);process.exit(1)})"
docker compose --env-file "$env_file" exec -T socket \
  node -e "fetch('http://127.0.0.1:4000/healthz').then(async r=>{console.log(r.status,await r.text());if(!r.ok)process.exit(1)}).catch(e=>{console.error(e);process.exit(1)})"
docker compose --env-file "$env_file" exec -T tunnel-monitor \
  node -e "require('dns').resolve4('cinemana.shabakaty.com',(e,a)=>{if(e)throw e;console.log(a.join(','))})"

