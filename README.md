# FlowOps

FlowOps is a full-stack enterprise workflow automation and approval platform.

## Packages

- [`flowops-api`](./flowops-api) — Express.js and TypeScript backend API
- [`flowops-web`](./flowops-web) — React and TypeScript frontend web application

## Local development

### Option 1: Docker Compose

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine with Compose).

```bash
docker compose up --build
```

- API: `http://localhost:5000/api`
- Web: `http://localhost:5173`
- API docs: `http://localhost:5000/api/docs`

Stop the stack:

```bash
docker compose down
```

Rebuild after dependency changes:

```bash
docker compose up --build
```

### Option 2: Run locally with Node.js

Start the backend:

```bash
cd flowops-api
npm install
cp .env.example .env
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

## Docker production builds

Build production images:

```bash
docker build -t flowops-api ./flowops-api --target production
docker build -t flowops-web ./flowops-web --target production
```
