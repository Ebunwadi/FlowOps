# FlowOps API

Express.js and TypeScript backend for the FlowOps workflow automation platform.

## Stack

- Express.js with TypeScript
- PostgreSQL with Prisma ORM 7
- Zod for validation
- Pino for structured logging
- Swagger / OpenAPI docs

## Getting started

### With Docker Compose (recommended)

From the repo root:

```bash
cp .env.example .env
docker compose up --build
```

The API runs at `http://localhost:5000/api`. Migrations are applied automatically on startup.

### Local development

Start PostgreSQL from the repo root, then:

```bash
npm install
cp .env.example .env
npm run db:migrate:deploy
npm run dev
```

The API runs at `http://localhost:5000/api`.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled production build |
| `npm test` | Run Jest tests |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm run db:migrate` | Create and apply a new migration (development) |
| `npm run db:migrate:deploy` | Apply existing migrations |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:studio` | Open Prisma Studio |

## Environment variables

| Variable | Description | Default |
| --- | --- | --- |
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | HTTP port | `5000` |
| `API_PREFIX` | Route prefix for API endpoints | `/api` |
| `LOG_LEVEL` | Pino log level (`debug`, `info`, `warn`, `error`) | `info` |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins | `http://localhost:5173` |
| `DATABASE_URL` | PostgreSQL connection string | — |

Example local value:

```env
DATABASE_URL=postgresql://flowops:flowops@localhost:5432/flowops?schema=public
```

When running in Docker Compose, database credentials are configured in the **repo root** `.env` file. The API container receives a `DATABASE_URL` pointing at the `postgres` service.

## Project structure

```text
prisma.config.ts      Database URL and Prisma CLI configuration
prisma/
  schema.prisma       Database schema
  migrations/         SQL migrations
src/
  generated/prisma/   Generated Prisma Client (do not edit)
  app.ts              Express app factory and middleware
  server.ts           HTTP server bootstrap
  config/             Environment, logger, and database client
  common/             Errors, HTTP helpers, and shared middleware
  modules/            Feature modules (health, auth, workflows, etc.)
  routes/             API route registration
  openapi/            Swagger / OpenAPI document
tests/                Jest integration tests
```

## API documentation

With the server running, open:

- Swagger UI: http://localhost:5000/api/docs

## Related documentation

- [Root README](../README.md) — full project setup, Docker Compose, and troubleshooting
