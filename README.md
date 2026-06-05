# FlowOps

FlowOps is a full-stack enterprise workflow automation and approval platform.

## Packages

- [`flowops-api`](./flowops-api) — Express.js and TypeScript backend API
- [`flowops-web`](./flowops-web) — React and TypeScript frontend web application

## Local development

### Option 1: Docker Compose

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine with Compose).

```bash
cp .env.example .env
docker compose up --build
```

- API: `http://localhost:5000/api`
- Web: `http://localhost:5173`
- API docs: `http://localhost:5000/api/docs`
- PostgreSQL: `localhost:5432` (`flowops` / `flowops`)

Stop the stack:

```bash
docker compose down
```

Rebuild after dependency changes:

```bash
docker compose up --build
```

### Option 2: Run locally with Node.js

Start PostgreSQL (Docker):

```bash
docker compose up -d postgres
```

Start the backend:

```bash
cd flowops-api
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

Start the frontend:

```bash
cd flowops-web
npm install
cp .env.example .env
npm run dev
```

- API: `http://localhost:5000/api`
- Web: `http://localhost:5173`

## Database commands

Run from `flowops-api`:

```bash
npm run db:migrate        # create/apply migrations in development
npm run db:migrate:deploy # apply migrations in production/docker
npm run db:generate       # regenerate Prisma client
npm run db:studio         # open Prisma Studio
```

## Docker production builds

Build production images:

```bash
docker build -t flowops-api ./flowops-api --target production
docker build -t flowops-web ./flowops-web --target production
```
