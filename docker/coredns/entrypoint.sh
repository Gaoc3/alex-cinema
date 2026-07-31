#!/bin/sh
set -eu

: "${TUNNEL_GATEWAY_IP:?TUNNEL_GATEWAY_IP is required}"

envsubst '${TUNNEL_GATEWAY_IP}' \
  < /etc/coredns/Corefile.template \
  > /tmp/Corefile

exec /usr/local/bin/coredns -conf /tmp/Corefile

