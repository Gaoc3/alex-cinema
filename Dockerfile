# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=24.12.0

FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

FROM dependencies AS builder
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
ARG NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/home
ARG NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/home
ARG NEXT_PUBLIC_TELEGRAM_BOT_URL
ARG NEXT_PUBLIC_CRYPTO_SECRET
ARG NEXT_PUBLIC_SOCKET_URL
ARG TUNNEL_PROXY_BASE_URL=http://web:8080
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY} \
    NEXT_PUBLIC_CLERK_SIGN_IN_URL=${NEXT_PUBLIC_CLERK_SIGN_IN_URL} \
    NEXT_PUBLIC_CLERK_SIGN_UP_URL=${NEXT_PUBLIC_CLERK_SIGN_UP_URL} \
    NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=${NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL} \
    NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=${NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL} \
    NEXT_PUBLIC_TELEGRAM_BOT_URL=${NEXT_PUBLIC_TELEGRAM_BOT_URL} \
    NEXT_PUBLIC_CRYPTO_SECRET=${NEXT_PUBLIC_CRYPTO_SECRET} \
    NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL} \
    TUNNEL_PROXY_BASE_URL=${TUNNEL_PROXY_BASE_URL}
COPY . .
RUN npm run build

FROM base AS production-dependencies
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev \
    && npx prisma generate \
    && npm cache clean --force

FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 alex \
    && useradd --system --uid 1001 --gid alex --home-dir /app alex
COPY --from=production-dependencies --chown=alex:alex /app/node_modules ./node_modules
COPY --from=builder --chown=alex:alex /app/.next ./.next
COPY --from=builder --chown=alex:alex /app/public ./public
COPY --from=builder --chown=alex:alex /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=alex:alex /app/next.config.js ./next.config.js
COPY --from=builder --chown=alex:alex /app/prisma ./prisma
COPY --from=builder --chown=alex:alex /app/socket-server.js ./socket-server.js
COPY --from=builder --chown=alex:alex /app/docker/tunnel-monitor.js ./docker/tunnel-monitor.js
USER alex
EXPOSE 3000 4000
CMD ["node", "node_modules/next/dist/bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]

