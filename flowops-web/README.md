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
- Keycloak (`keycloak-js`) for authentication

## Getting started

```bash
npm install
cp .env.example .env
npm run dev
```

The app runs at `http://localhost:5173`. Ensure the API is running at the URL configured in `VITE_API_BASE_URL` (default `http://localhost:5000/api`).

Start Keycloak before testing sign-in (see the [root README](../README.md#keycloak-local-development)):

```bash
docker compose up -d keycloak
```

Test users: `test.user` / `password` or `admin.user` / `password`.

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
  auth/          Keycloak auth provider, hooks, and token access
  components/    Shared UI and layout components
  config/        Environment and Keycloak configuration
  lib/           Shared utilities
  pages/         Route-level page components
  routes/        React Router configuration
  types/         Shared TypeScript types
```

## Authentication

The app uses `keycloak-js` with PKCE against the `flowops-web` public client. On load, Keycloak performs a silent session check; unauthenticated users can sign in via the header **Sign in** button. Authenticated API requests automatically include a `Bearer` token when available.

Frontend logs are sent to the API (`POST /api/logs/client`) and appear in Seq with `service = 'flowops-web'`. Set `VITE_CLIENT_LOGGING=false` to disable forwarding while keeping console output.

## Related documentation

- [Root README](../README.md) — full project setup, Docker Compose, and troubleshooting
