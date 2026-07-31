#!/bin/sh
set -eu

authorized_keys=/run/secrets/tunnel_authorized_keys
authorized_keys_copy=/home/tunnel/.ssh/authorized_keys
host_key=/etc/ssh/keys/ssh_host_ed25519_key

if [ ! -s "$authorized_keys" ]; then
  echo "Missing tunnel authorized_keys secret" >&2
  exit 1
fi

mkdir -p /home/tunnel/.ssh
cp "$authorized_keys" "$authorized_keys_copy"
chown -R tunnel:tunnel /home/tunnel/.ssh
chmod 0700 /home/tunnel/.ssh
chmod 0600 "$authorized_keys_copy"

if [ ! -s "$host_key" ]; then
  ssh-keygen -q -t ed25519 -N '' -f "$host_key"
fi

chmod 0600 "$host_key"
exec /usr/sbin/sshd -D -e -f /etc/ssh/sshd_config
