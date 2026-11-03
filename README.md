# Euclid Monorepo

High-performance, type-safe full-stack monorepo featuring **Hono**, **React (Vite)**, **PostgreSQL**, **Langfuse**, **OpenAI SDK**, **pg-boss**, and **Kysely**.

---

## 🏛 Architecture Overview

```
euclid/
├── apps/
│   ├── api/                   # Hono HTTP API server with type-safe RPC routes
│   │   ├── src/routes/        # Modular route controllers (ai, users, health)
│   │   └── Dockerfile         # Multi-stage production container
│   │
│   ├── web/                   # React 18 + Vite frontend
│   │   ├── src/lib/client.ts  # End-to-end typed Hono RPC client (hc<AppType>)
│   │   ├── src/App.tsx        # Interactive dashboard
│   │   └── Dockerfile         # Multi-stage Nginx container
│   │
│   └── worker/                # pg-boss background worker
│       ├── src/index.ts       # Job handlers (AI task queue, Kysely DB updates)
│       └── Dockerfile         # Multi-stage worker container
│
├── packages/
│   ├── db/                    # Shared Kysely database layer, schema & migrations
│   ├── queue/                 # Shared pg-boss client & typed queue definitions
│   ├── ai/                    # Shared OpenAI SDK + Langfuse tracing integration
│   └── tsconfig/              # Shared TypeScript configurations (base, node, react)
│
├── docker/
│   ├── docker-compose.infra.yml # Backing services only (Postgres + Langfuse) for local dev
│   ├── docker-compose.yml       # Complete containerized production stack
│   └── init-db.sh               # Automatic DB provisioner (euclid_db + langfuse)
│
├── pnpm-workspace.yaml
├── package.json
└── .env.example
```

---

## ⚡ DX (Developer Experience) Highlights

1. **End-to-End Type Safety (Zero Codegen)**:
   - The Hono API exports its router type (`AppType = typeof routes`).
   - The React app imports `AppType` into `hc<AppType>('/')` to get instant TypeScript autocompletion and compile-time validation on all routes, query parameters, request bodies, and JSON responses.
2. **Dual Development Modes**:
   - **Hybrid Mode (Recommended for fastest DX)**: Spin up PostgreSQL and Langfuse in Docker (`pnpm dev:infra`), then run Vite, Hono, and pg-boss worker locally with live HMR (`pnpm dev`).
   - **Full Docker Mode**: Run the entire production stack inside Docker containers (`pnpm docker:up`).
3. **Robust Background Processing (pg-boss)**:
   - Uses PostgreSQL itself as a transactional job queue.
   - Eliminates the operational overhead of running and maintaining Redis.
   - Guaranteed at-least-once execution and retry backoff.
4. **LLM Observability (Langfuse)**:
   - Traces all OpenAI requests with prompt inputs, token usage, completion outputs, and latency.
   - Langfuse UI runs locally on `http://localhost:3000`.
   - Includes graceful fallback if no OpenAI API key is set yet (simulated responses with active tracing for immediate testing).
5. **Type-Safe SQL Builder & Migrations (Kysely)**:
   - Clean, lightweight SQL query builder with full TypeScript autocomplete.
   - Built-in programmatic migrator script (`pnpm db:migrate`).

---

## 🚀 Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/) (v9+)
- [Docker](https://www.docker.com/) & Docker Compose

### 2. Setup Environment
```bash
cp .env.example .env
pnpm install
```

### 3. Start Backing Infrastructure (Postgres & Langfuse)
```bash
pnpm dev:infra
```
* PostgreSQL will start on `localhost:5432` (`euclid_db` and `langfuse` databases are auto-created).*
* Langfuse Web UI will be available at `http://localhost:3000`.*

### 4. Run Database Migrations
```bash
pnpm db:migrate
```

### 5. Launch Development Servers
```bash
pnpm dev
```
This runs the following concurrently:
- **Web App**: [http://localhost:5173](http://localhost:5173) (Vite HMR)
- **API Server**: [http://localhost:4000](http://localhost:4000) (tsx watch)
- **Worker**: pg-boss background consumer (tsx watch)

---

## 🐳 Full Containerized Stack

To build and run all services (PostgreSQL, Langfuse, Hono API, Worker, and React Nginx) in Docker:

```bash
pnpm docker:up
```

- **Web Frontend**: [http://localhost:8080](http://localhost:8080)
- **Hono API**: [http://localhost:4000](http://localhost:4000)
- **Langfuse UI**: [http://localhost:3000](http://localhost:3000)

To stop the containers:
```bash
pnpm docker:down
```

---

## 📜 Workspace Scripts Reference

| Command | Description |
|---|---|
| `pnpm dev` | Starts all apps in parallel with hot reloading |
| `pnpm dev:infra` | Starts Postgres & Langfuse docker containers |
| `pnpm dev:infra:down` | Stops Postgres & Langfuse containers |
| `pnpm build` | Typechecks and compiles all packages and apps |
| `pnpm typecheck` | Runs `tsc --noEmit` across all workspace projects |
| `pnpm db:migrate` | Runs Kysely database migrations to latest schema |
| `pnpm db:migrate:down` | Rolls back the last Kysely migration |
| `pnpm docker:up` | Builds and runs complete multi-container Docker stack |
| `pnpm docker:down` | Stops all docker compose containers |

---

## 🔑 Environment Variables (`.env`)

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/euclid_db` |
| `PORT` | Port for Hono API server | `4000` |
| `OPENAI_API_KEY` | OpenAI API Key (optional for mock testing) | - |
| `LANGFUSE_BASE_URL` | URL to Langfuse host | `http://localhost:3000` |
| `LANGFUSE_PUBLIC_KEY`| Langfuse public API key | `pk-lf-mock` |
| `LANGFUSE_SECRET_KEY`| Langfuse secret API key | `sk-lf-mock` |
