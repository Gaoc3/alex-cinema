#!/bin/sh
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${RESTORE_FILE:?RESTORE_FILE must point to a file under /backups}"
postgres_url="$(printf '%s' "$DATABASE_URL" | sed -E \
  -e 's/([?&])schema=[^&]*&/\1/' \
  -e 's/[?&]schema=[^&]*$//' \
  -e 's/\?&/?/')"

if [ "${CONFIRM_RESTORE:-}" != "RESTORE_ALEX_CINEMA" ]; then
  echo "Set CONFIRM_RESTORE=RESTORE_ALEX_CINEMA to allow this destructive restore." >&2
  exit 2
fi

case "$RESTORE_FILE" in
  /backups/*.dump) ;;
  *) echo "RESTORE_FILE must be an absolute /backups/*.dump path" >&2; exit 2 ;;
esac

if [ ! -f "$RESTORE_FILE" ]; then
  echo "Backup not found: $RESTORE_FILE" >&2
  exit 2
fi

pg_restore \
  --dbname="$postgres_url" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --single-transaction \
  --exit-on-error \
  "$RESTORE_FILE"

echo "Restore completed from: $RESTORE_FILE"
