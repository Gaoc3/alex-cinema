#!/bin/sh
set -eu

project_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$project_dir"

if [ ! -f .env.docker ]; then
  cp .env.docker.example .env.docker
  chmod 0600 .env.docker
  echo "Created .env.docker. Replace every CHANGE_ME value before deployment."
fi

mkdir -p backups docker/router/secrets docker/tunnel-sshd/secrets
chmod 0700 docker/router/secrets docker/tunnel-sshd/secrets

private_key=docker/router/secrets/id_ed25519
public_key="${private_key}.pub"
authorized_keys=docker/tunnel-sshd/secrets/authorized_keys

if [ ! -s "$private_key" ]; then
  ssh-keygen -q -t ed25519 -N '' -C alex-cinema-router -f "$private_key"
fi

if [ ! -s "$authorized_keys" ]; then
  printf 'restrict,port-forwarding,permitlisten="0.0.0.0:8443" %s\n' "$(cat "$public_key")" \
    > "$authorized_keys"
fi

chmod 0600 "$private_key" "$authorized_keys"
chmod 0644 "$public_key"

echo "Tunnel keys are ready."
echo "Keep docker/router/secrets/id_ed25519 private and copy it only to the Earthlink router/bridge."

