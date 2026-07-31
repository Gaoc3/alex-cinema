#!/bin/sh
set -eu

: "${VPS_HOST:?VPS_HOST is required}"

key_source=/run/secrets/router_tunnel_key
known_hosts=/run/secrets/vps_known_hosts
key_copy=/tmp/id_ed25519
known_hosts_copy=/tmp/known_hosts

if [ ! -s "$key_source" ] || [ ! -s "$known_hosts" ]; then
  echo "Router tunnel key or VPS known_hosts is missing" >&2
  exit 1
fi

cp "$key_source" "$key_copy"
cp "$known_hosts" "$known_hosts_copy"
chown tunnel:tunnel "$key_copy" "$known_hosts_copy"
chmod 0600 "$key_copy" "$known_hosts_copy"

export AUTOSSH_GATETIME=0
export AUTOSSH_POLL=15

exec su-exec tunnel autossh -M 0 -N -T \
  -i "$key_copy" \
  -p "${VPS_TUNNEL_SSH_PORT:-2222}" \
  -o BatchMode=yes \
  -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=10 \
  -o ServerAliveCountMax=3 \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$known_hosts_copy" \
  -R "${REMOTE_TUNNEL_BIND:-0.0.0.0}:${REMOTE_TUNNEL_PORT:-8443}:${LOCAL_PROXY_HOST:-127.0.0.1}:${LOCAL_PROXY_PORT:-8443}" \
  "${VPS_TUNNEL_USER:-tunnel}@${VPS_HOST}"
