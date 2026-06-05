# FlowOps

FlowOps is a full-stack enterprise workflow automation and approval platform for managing internal requests, approvals, audit trails, and multi-step business processes.

## Tech stack

| Layer | Technologies |
| --- | --- |
| Backend | Express.js, TypeScript, Prisma, PostgreSQL, Pino, Zod |
| Frontend | React, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS |
| Infrastructure | Docker Compose, PostgreSQL 16 |

## Prerequisites

- [Node.js](https://nodejs.org/) **20.19+**
- [npm](https://www.npmjs.com/) **10+**
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended) or Docker Engine with Compose

## Repository structure

```text
FlowOps/
├── docker-compose.yml      # Local dev stack (postgres, api, web)
├── .env.example            # Shared Docker Compose environment variables
├── flowops-api/            # Express.js backend API
└── flowops-web/            # React frontend application
```

## Quick start (Docker Compose)

```bash
cp .env.example .env
docker compose up --build
```

| Service | URL |
| --- | --- |
| Web | http://localhost:5173 |
| API | http://localhost:5000/api |
| API docs | http://localhost:5000/api/docs |
| PostgreSQL | `localhost:5432` (user/password/db: `flowops`) |

Stop the stack:

```bash
docker compose down
```

Rebuild after dependency or Dockerfile changes:

```bash
docker compose up --build
```

## Local development (Node.js)

Use this when you want hot reload outside Docker containers.

### 1. Start PostgreSQL

```bash
cp .env.example .env
docker compose up -d postgres
```

### 2. Start the API

```bash
cd flowops-api
npm install
cp .env.example .env
npm run db:migrate:deploy
npm run dev
```

### 3. Start the web app

In a separate terminal:

```bash
cd flowops-web
npm install
cp .env.example .env
npm run dev
```

## Environment variables

Docker Compose reads from the **repo root** `.env` file. Local Node.js development uses package-level `.env` files.

### Root `.env` (Docker Compose)

| Variable | Description | Default |
| --- | --- | --- |
| `POSTGRES_VERSION` | PostgreSQL Docker image tag | `16-alpine` |
| `POSTGRES_USER` | Database user | `flowops` |
| `POSTGRES_PASSWORD` | Database password | `flowops` |
| `POSTGRES_DB` | Database name | `flowops` |
| `POSTGRES_PORT` | Host port for PostgreSQL | `5432` |
| `NODE_ENV` | API runtime environment | `development` |
| `PORT` | API port | `5000` |
| `API_PREFIX` | API route prefix | `/api` |
| `LOG_LEVEL` | Pino log level | `info` |
| `CORS_ORIGINS` | Allowed frontend origins | `http://localhost:5173` |
| `VITE_API_BASE_URL` | Frontend API base URL | `http://localhost:5000/api` |

See [flowops-api/.env.example](./flowops-api/.env.example) and [flowops-web/.env.example](./flowops-web/.env.example) for local development.

## Database commands

Run from `flowops-api`:

```bash
npm run db:migrate        # create and apply a new migration (development)
npm run db:migrate:deploy # apply existing migrations
npm run db:generate       # regenerate Prisma client
npm run db:studio         # open Prisma Studio
```

## Testing and quality checks

### API

```bash
cd flowops-api
npm test
npm run lint
npm run typecheck
```

### Web

```bash
cd flowops-web
npm run lint
npm run typecheck
npm run build
```

## Docker production builds

```bash
docker build -t flowops-api ./flowops-api --target production
docker build -t flowops-web ./flowops-web --target production
```

## Package documentation

- [flowops-api/README.md](./flowops-api/README.md)
- [flowops-web/README.md](./flowops-web/README.md)
