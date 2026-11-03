FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Stage 1: Build
FROM base AS builder
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.json ./
COPY packages/ packages/
COPY apps/worker/ apps/worker/

RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @euclid/db build
RUN pnpm --filter @euclid/queue build
RUN pnpm --filter @euclid/ai build
RUN pnpm --filter @euclid/worker build

# Stage 2: Runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app /app

CMD ["node", "apps/worker/dist/index.js"]
