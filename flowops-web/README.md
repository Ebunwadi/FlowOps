# FlowOps Web

React and TypeScript frontend for the FlowOps workflow automation platform.

## Stack

- React 19 with TypeScript
- Vite
- React Router
- TanStack Query
- React Hook Form and Zod
- Tailwind CSS
- shadcn-style UI components

## Getting started

```bash
npm install
cp .env.example .env
npm run dev
```

The app runs at `http://localhost:5173`. Ensure the API is running at the URL configured in `VITE_API_BASE_URL` (default `http://localhost:5000/api`).

For full project setup, see the [root README](../README.md).

## Scripts

- `npm run dev` — start the development server
- `npm run build` — type-check and build for production
- `npm run preview` — preview the production build
- `npm run lint` — run ESLint
- `npm run typecheck` — run TypeScript without emitting files

## Environment variables

| Variable | Description | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Base URL for the FlowOps API | `http://localhost:5000/api` |
| `VITE_KEYCLOAK_URL` | Keycloak server URL | `http://localhost:8080` |
| `VITE_KEYCLOAK_REALM` | Keycloak realm | `flowops` |
| `VITE_KEYCLOAK_CLIENT_ID` | Keycloak public client ID | `flowops-web` |

## Project structure

```text
src/
  api/           API client and endpoint modules
  components/    Shared UI and layout components
  config/        Environment configuration
  lib/           Shared utilities
  pages/         Route-level page components
  routes/        React Router configuration
  types/         Shared TypeScript types
```

## Related documentation

- [Root README](../README.md) — full project setup, Docker Compose, and troubleshooting
