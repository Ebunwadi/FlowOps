# FlowOps API

Express.js and TypeScript backend for the FlowOps workflow automation platform.

## Stack

- Express.js with TypeScript
- PostgreSQL with Prisma ORM 7
- MinIO / S3-compatible object storage for attachment files
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
| `npm run db:seed` | Seed default permissions (idempotent) |
| `npm run db:studio` | Open Prisma Studio |

## Database seed

After migrations, seed the default FlowOps permission keys (safe to run multiple times):

```bash
npm run db:seed
```

This upserts 35 system permissions such as `organisation:create`, `members:invite`, and `approvals:approve`. Permissions are stored in the `permissions` table and can later be attached to roles via `role_permissions`.

With Docker Compose from the repo root:

```bash
docker compose exec api npm run db:seed
```

## Environment variables

| Variable | Description | Default |
| --- | --- | --- |
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | HTTP port | `5000` |
| `API_PREFIX` | Route prefix for API endpoints | `/api` |
| `LOG_LEVEL` | Pino log level (`debug`, `info`, `warn`, `error`) | `info` |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins | `http://localhost:5173` |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `SEQ_SERVER_URL` | Seq ingestion URL (enables centralized logging) | — |
| `SEQ_API_KEY` | Seq API key when ingestion auth is enabled | — |
| `KEYCLOAK_ISSUER` | Expected JWT issuer (Keycloak realm URL) | `http://localhost:8080/realms/flowops` |
| `KEYCLOAK_JWKS_URI` | JWKS endpoint for signature verification | `{KEYCLOAK_ISSUER}/protocol/openid-connect/certs` |
| `KEYCLOAK_CLIENT_ID` | Expected token client (`azp` claim) | `flowops-web` |
| `REDIS_URL` | Redis connection string (BullMQ job queues) | `redis://localhost:6379` |
| `STORAGE_PROVIDER` | Object storage backend (`minio` or `s3`) | `minio` |
| `STORAGE_ENDPOINT` | S3-compatible API endpoint | `http://localhost:9000` |
| `STORAGE_ACCESS_KEY` | Object storage access key | `minioadmin` |
| `STORAGE_SECRET_KEY` | Object storage secret key | `minioadmin` |
| `STORAGE_BUCKET` | Bucket for workflow request attachments | `flowops-attachments` |
| `STORAGE_REGION` | S3 region name | `us-east-1` |
| `STORAGE_FORCE_PATH_STYLE` | Use path-style URLs (required for MinIO) | `true` |

Example local value:

```env
DATABASE_URL=postgresql://flowops:flowops@localhost:5432/flowops?schema=public
```

When running in Docker Compose, database credentials are configured in the **repo root** `.env` file. The API container receives a `DATABASE_URL` pointing at the `postgres` service and `STORAGE_ENDPOINT=http://minio:9000` for attachment uploads.

## Object storage and attachments

Workflow request **attachments** store file bytes in MinIO (local) or any S3-compatible provider (production). PostgreSQL stores metadata only (`Attachment` model).

| Endpoint | Description |
| --- | --- |
| `POST /api/workflow-requests/:id/attachments` | Upload a file (`multipart/form-data`, field name `file`) |
| `GET /api/workflow-requests/:id/attachments` | List attachment metadata for a request |
| `GET /api/workflow-requests/:id` | Request detail includes an `attachments` array |
| `GET /api/attachments/:id/download` | Download file (backend streams from object storage) |
| `DELETE /api/attachments/:id` | Delete attachment (uploader or `requests:view-all`) |

Allowed file types: PDF, PNG, JPG/JPEG, DOCX, XLSX, CSV, TXT. Maximum size: **10MB**.

`GET /api/health` includes a `storage` field (`connected` / `disconnected`) when MinIO is configured.

With Docker Compose, the `minio-init` service creates the `flowops-attachments` bucket automatically.

## Logging (Seq)

When `SEQ_SERVER_URL` is set, structured Pino logs are forwarded to [Seq](https://datalust.co/seq) in addition to stdout. Each event includes a `service: flowops-api` property for filtering.

The frontend posts batched browser logs to `POST /api/logs/client`. Those events are written with `service: flowops-web` and `source: browser`.

With Docker Compose from the repo root, open http://localhost:5341 to search and filter API logs.

Example API message: `[API] GET /api/health returned 200 in 4ms`

Structured fields: `origin`, `event`, `httpMethod`, `httpPath`, `httpStatus`, `durationMs`, and `requestId`.

Local API development against a running Seq instance:

```env
SEQ_SERVER_URL=http://localhost:5341
```

## Authentication (JWT)

Protected routes use the `authenticate` middleware to validate Keycloak-issued JWT access tokens:

1. Reads the `Authorization: Bearer <token>` header
2. Fetches Keycloak public keys from JWKS (cached)
3. Verifies signature, issuer, and expiry
4. Validates the `azp` (authorized party) claim matches `KEYCLOAK_CLIENT_ID`
5. Attaches the Keycloak session to `req.user`

`GET /api/auth/me` runs `ensureLocalUser`, which creates or updates the local `users` row and sets `req.localUser` before returning the profile.

Example protected endpoint: `GET /api/auth/me` — returns the local user id, profile fields, and Keycloak roles.

Public routes (no token required): `/api/health`, `/api/logs/client`.

**Docker note:** tokens issued to the browser contain issuer `http://localhost:8080/realms/flowops`, while the API container fetches JWKS from `http://keycloak:8080/...` (configured in `docker-compose.yml`).

## Project structure

```text
prisma.config.ts      Database URL and Prisma CLI configuration
prisma/
  schema.prisma       Database schema (users, organisations, roles, permissions)
  migrations/         SQL migrations
src/
  generated/prisma/   Generated Prisma Client (do not edit)
  app.ts              Express app factory and middleware
  auth/               Keycloak JWT verification
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
