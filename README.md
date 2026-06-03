# FlowOps

FlowOps is a full-stack enterprise workflow automation and approval platform.

## Packages

- [`flowops-api`](./flowops-api) — Express.js and TypeScript backend API
- [`flowops-web`](./flowops-web) — React and TypeScript frontend web application

## Local development

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
