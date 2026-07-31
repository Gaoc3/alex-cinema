#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this installer as root." >&2
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  echo "Docker Engine and Compose are already available."
  exit 0
fi

. /etc/os-release
case "${ID:-}" in
  debian|ubuntu) ;;
  *) echo "This installer supports Debian and Ubuntu only." >&2; exit 1 ;;
esac

apt-get update
apt-get install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL "https://download.docker.com/linux/${ID}/gpg" -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

architecture="$(dpkg --print-architecture)"
codename="${VERSION_CODENAME:?VERSION_CODENAME is missing from /etc/os-release}"
printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/%s %s stable\n' \
  "$architecture" "$ID" "$codename" \
  > /etc/apt/sources.list.d/docker.list

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

docker version
docker compose version

