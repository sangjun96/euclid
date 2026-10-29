FROM oven/bun:1.4.4 AS dependencies
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/log/package.json packages/log/package.json
RUN bun install --frozen-lockfile

FROM dependencies AS development
COPY . .

FROM development AS build
RUN bun run --bun build:web

FROM oven/bun:1.4.4 AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
USER bun
