#!/bin/sh
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
postgres_url="$(printf '%s' "$DATABASE_URL" | sed -E \
  -e 's/([?&])schema=[^&]*&/\1/' \
  -e 's/[?&]schema=[^&]*$//' \
  -e 's/\?&/?/')"
retention_days="${BACKUP_RETENTION_DAYS:-14}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
destination="/backups/alex-cinema-${timestamp}.dump"
temporary="${destination}.partial"

umask 077
mkdir -p /backups
trap 'rm -f "$temporary"' EXIT HUP INT TERM

pg_dump "$postgres_url" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="$temporary"

mv "$temporary" "$destination"
sha256sum "$destination" > "${destination}.sha256"
find /backups -type f \( -name 'alex-cinema-*.dump' -o -name 'alex-cinema-*.dump.sha256' \) \
  -mtime "+${retention_days}" -delete

echo "Backup created: $destination"
