FROM alpine:3.20.3

RUN apk add --no-cache openssh-server \
    && adduser -D -h /home/tunnel -s /bin/ash tunnel \
    && passwd -d tunnel \
    && mkdir -p /etc/ssh/keys /run/sshd

COPY docker/tunnel-sshd/sshd_config /etc/ssh/sshd_config
COPY docker/tunnel-sshd/entrypoint.sh /usr/local/bin/tunnel-sshd-entrypoint
RUN chmod 0755 /usr/local/bin/tunnel-sshd-entrypoint

EXPOSE 2222 8443
ENTRYPOINT ["/usr/local/bin/tunnel-sshd-entrypoint"]
