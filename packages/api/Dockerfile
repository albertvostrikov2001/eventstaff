# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl && rm -rf /var/lib/apt/lists/*
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/
# prisma generate runs in package postinstall — schema must exist before install
COPY packages/api/prisma ./packages/api/prisma

# Only API + shared (not web); matches lockfile subgraph for Docker image size
RUN pnpm install --frozen-lockfile --filter "@unity/api..."

COPY packages/shared ./packages/shared
COPY packages/api ./packages/api

ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN pnpm --filter @unity/api exec prisma generate
RUN pnpm --filter @unity/api build

RUN chmod +x packages/api/docker-entrypoint.sh

ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=4000

EXPOSE 4000

ENTRYPOINT ["/app/packages/api/docker-entrypoint.sh"]
