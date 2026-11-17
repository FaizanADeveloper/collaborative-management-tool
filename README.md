# Flowdesk — Real-Time Collaborative Workspace

Flowdesk is a real-time collaborative project management application built for agile software teams. It provides workspaces, boards, lists, task cards, drag-and-drop workflow automation, real-time presence, typing indicators, card comment threads, full-text search, in-app notifications, and distributed Redis pub/sub synchronization.

---

## 1. System Architecture

```
collaborative-management-tool/
├── .github/workflows/          # CI/CD pipelines (Continuous Integration & Deployment)
│   ├── ci.yml                  # Matrix testing, linting, build verification
│   └── deploy.yml              # Automated release workflow with health check probes
├── backend/                    # Node.js 26, Express 5, Socket.IO, Redis, MongoDB Atlas
│   ├── src/
│   │   ├── config/             # DB, environment & Zod schema validation
│   │   ├── controllers/        # REST controllers (auth, board, card, search, notification)
│   │   ├── middleware/         # Auth, RBAC, error & Redis-backed rate limiting
│   │   ├── models/             # Mongoose schemas (User, Workspace, Board, List, Card, Comment, Notification)
│   │   ├── redis/              # Distributed presence, typing, adapter & rate limiter
│   │   ├── routes/             # REST route registration & health probe
│   │   ├── services/           # Business logic & domain events
│   │   ├── socket/             # Real-time rooms, events, auth & heartbeat
│   │   └── utils/              # Token, positioning, CORS & error utilities
│   ├── tests/                  # Unit tests (23 suites, 300 tests) & integration tests
│   └── Dockerfile              # Production container definition
├── frontend/                   # React 18, Vite, Tailwind CSS, Zustand
│   ├── src/
│   │   ├── components/         # Kanban, modals, drawers, notifications, search
│   │   ├── pages/              # Dashboard, Board, Team, Settings, Auth
│   │   ├── services/           # HTTP apiClient, socketClient, notificationService
│   │   └── store/              # Zustand state stores (Board, Auth, Workspace, UI, Notification)
│   ├── Dockerfile              # Multi-stage production container with Nginx
│   ├── nginx.conf              # SPA rewrite fallback & security headers
│   └── vercel.json / netlify.toml # Static hosting redirect & header configurations
├── docs/                       # Specifications, API documentation & roadmap
└── render.yaml                 # Render Blueprint infrastructure-as-code
```

---

## 2. Technology Stack

- **Backend:** Node.js 26, Express 5, Mongoose 9, MongoDB Atlas
- **Distributed Real-Time & Caching:** Redis Cloud, ioredis 6, Socket.IO 4.8, `@socket.io/redis-adapter`
- **Security:** JWT, bcryptjs, Helmet, Zod 4, Redis-backed rate limiting
- **Frontend:** React 18, Vite, Tailwind CSS, Zustand 5, Lucide React, `@hello-pangea/dnd`
- **Testing:** Jest 30, Supertest 7, Vitest 4, React Testing Library
- **CI/CD & DevOps:** GitHub Actions, Docker, Render, Railway, Vercel, Netlify

---

## 3. Local Development Setup

### Prerequisites
- Node.js 20+ (Node.js 22 or 26 recommended)
- npm 10+
- MongoDB instance (local or MongoDB Atlas connection URI)
- Redis instance (optional: Redis Cloud or local Redis; falls back to in-memory mode if unset)

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MONGODB_URI, JWT_SECRET, and optional REDIS_URL
npm run dev
```
Backend runs by default at `http://localhost:5000`.

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs by default at `http://localhost:3000` and automatically proxies `/api` and `/socket.io` to the backend.

---

## 4. Test & Verification Commands

```bash
# Backend unit test suite (300 tests)
npm run test:unit --prefix backend

# Backend live MongoDB Atlas integration test suite
npm run test:integration --prefix backend

# Frontend test suite (131 tests)
npm test --prefix frontend

# Frontend production bundle build
npm run build --prefix frontend
```

---

## 5. Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | Port for the HTTP and Socket.IO server |
| `NODE_ENV` | No | `development` | Environment mode (`development`, `production`, `test`) |
| `MONGODB_URI` | Yes | — | MongoDB Atlas connection string (`mongodb://` or `mongodb+srv://`) |
| `JWT_SECRET` | Yes | — | Secret key for signing authentication JWTs (minimum 10 chars, 32+ recommended) |
| `JWT_EXPIRES_IN` | No | `7d` | Token lifetime (e.g. `7d`, `24h`) |
| `CLIENT_URL` | No | `http://localhost:3000` | Allowed CORS origins. Supports comma-separated list in production |
| `REDIS_URL` | No | — | Redis connection URI (`redis://` or `rediss://`) for distributed features |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | No | `http://localhost:5000/api` | Base URL for REST API endpoints. Use `/api` if reverse proxied |
| `VITE_SOCKET_URL` | No | Derived | Base URL for Socket.IO gateway (auto-derived from `VITE_API_URL` origin if omitted) |

---

## 6. Continuous Integration & Deployment (CI/CD)

### GitHub Actions Pipelines

1. **Continuous Integration (`.github/workflows/ci.yml`):**
   - Triggers on every push and pull request targeting `frontend` or `main`.
   - Runs backend unit tests across a Node.js matrix (`20.x`, `22.x`).
   - Runs conditional live Atlas integration tests when `MONGODB_URI` secret is provided.
   - Runs frontend Vitest test suite and builds the Vite production distribution.
   - Enforces dependency caching and concurrency controls.

2. **Automated Deployment (`.github/workflows/deploy.yml`):**
   - Triggers on manual workflow dispatch with target selection (`production` or `staging`).
   - Verifies tests and builds before initiating deployment.
   - Deploys backend service to Render / Railway.
   - Deploys frontend static client to Vercel / Netlify.
   - Executes post-deployment health check against `/api/health` with automatic retry and backoff.

### Required GitHub Repository Secrets

Configure these in **GitHub Settings > Secrets and variables > Actions**:

- `MONGODB_URI` — Production or CI MongoDB Atlas connection URI.
- `JWT_SECRET` — Production JWT signing key.
- `REDIS_URL` — Production Redis connection string.
- `RENDER_DEPLOY_HOOK_URL` — (Optional) Render Deploy Hook URL for zero-downtime backend deployment.
- `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` — (Optional) Vercel deployment credentials.
- `NETLIFY_AUTH_TOKEN` / `NETLIFY_SITE_ID` — (Optional) Netlify deployment credentials.
- `PRODUCTION_BACKEND_URL` — Public HTTPS URL of the deployed backend (e.g. `https://flowdesk-api.onrender.com`).

---

## 7. Production Deployment Guide (Render + Vercel Architecture)

### 1. Backend Web Service (Render)
1. In [Render Dashboard](https://dashboard.render.com), select **New > Blueprint** and connect this repository (or select **New > Web Service** pointing to `rootDir: backend`).
2. When prompted by `render.yaml`, configure the environment variables:
   - `MONGODB_URI`: Your MongoDB Atlas connection URI (`mongodb+srv://...`).
   - `REDIS_URL`: Your Redis Cloud connection URI (`redis://...`).
   - `CLIENT_URL`: Your Vercel frontend URL (e.g. `https://flowdesk.vercel.app`).
   - `JWT_SECRET`: High-entropy string (or let Render auto-generate).
   - `JWT_EXPIRES_IN`: `7d`
3. Render automatically provisions and deploys `flowdesk-api` with health checks on `/api/health`.
4. Copy your live Render service URL (e.g. `https://flowdesk-api.onrender.com`).

### 2. Frontend Client (Vercel)
1. In [Vercel Dashboard](https://vercel.com/new), import your GitHub repository.
2. In Project Settings:
   - **Root Directory:** Set to `frontend`.
   - **Framework Preset:** Vite (auto-detected via `frontend/vercel.json`).
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add Environment Variable:
   - `VITE_API_URL`: Your Render backend URL with `/api` path (e.g. `https://flowdesk-api.onrender.com/api`).
4. Click **Deploy**. Vercel automatically deploys the static SPA with full rewrite fallback support.
5. Copy your live Vercel URL and update `CLIENT_URL` in Render if needed.

### 3. Alternative: Docker Containers
- **Backend:** `docker build -t flowdesk-backend backend/`
- **Frontend:** `docker build -t flowdesk-frontend frontend/`

---

## 8. Health Check & Diagnostics

Flowdesk exposes an unauthenticated health probe:
```bash
GET /api/health
```

Example healthy response:
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2026-11-17T09:30:00.000Z",
  "uptime": 3600,
  "services": {
    "api": "healthy",
    "database": "connected",
    "redis": "ready",
    "socketAdapter": "redis"
  }
}
```
If Redis is not configured, the application gracefully operates in memory mode:
`"redis": "not_configured"`, `"socketAdapter": "in_memory"`.

---

## 9. Troubleshooting

- **CORS Errors:** Ensure `CLIENT_URL` on the backend matches the exact origin of your frontend domain without a trailing slash (e.g. `https://flowdesk.vercel.app`). Comma-separated domains are supported for preview deployments.
- **WebSocket Disconnection:** Ensure your hosting provider supports long-lived WebSocket connections (supported natively on Render, Railway, Fly.io, and container runtimes).
- **Page Refresh 404 in SPA:** Verify `vercel.json` or `_redirects` is active so all paths route to `/index.html`.
