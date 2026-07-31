FROM coredns/coredns:1.11.3 AS coredns
FROM alpine:3.20.3
RUN apk add --no-cache gettext
COPY --from=coredns /coredns /usr/local/bin/coredns
COPY docker/coredns/Corefile.template /etc/coredns/Corefile.template
COPY docker/coredns/entrypoint.sh /usr/local/bin/coredns-entrypoint
RUN chmod 0755 /usr/local/bin/coredns-entrypoint
EXPOSE 53/udp 53/tcp 8080 8181
ENTRYPOINT ["/usr/local/bin/coredns-entrypoint"]

