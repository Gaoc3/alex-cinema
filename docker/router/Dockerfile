FROM alpine:3.20.3

RUN apk add --no-cache autossh openssh-client su-exec \
    && adduser -D -u 1001 -h /home/tunnel tunnel

COPY docker/router/entrypoint.sh /usr/local/bin/router-tunnel-entrypoint
RUN chmod 0755 /usr/local/bin/router-tunnel-entrypoint

ENTRYPOINT ["/usr/local/bin/router-tunnel-entrypoint"]
