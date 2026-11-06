# Collaborative Management Tool — Backend Architecture & Testing Guide

This directory houses the Node.js, Express 5, and Mongoose 9 backend service for the **Real-Time Collaborative Workspace (Agile Management Tool)**.

---

## 1. Prerequisites & Environment Configuration

The backend connects directly to **MongoDB Atlas** (or a local MongoDB daemon) using Mongoose.

### Environment Setup (`backend/.env`)

Copy the template from `backend/.env.example`:

```powershell
copy backend\.env.example backend\.env
```

Ensure the following variables are configured in `backend/.env`:

| Variable | Requirement | Format / Example | Default Fallback |
| :--- | :--- | :--- | :--- |
| `MONGODB_URI` | **Required** | `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority` | None (skips DB with warning) |
| `PORT` | Optional | `5000` | `5000` |
| `NODE_ENV` | Optional | `development` \| `production` \| `test` | `development` |
| `JWT_SECRET` | Recommended | String (at least 10 characters) | Built-in dev fallback |
| `JWT_EXPIRES_IN` | Optional | `7d` | `7d` |
| `CLIENT_URL` | Optional | `http://localhost:3000` | `http://localhost:3000` |

> [!IMPORTANT]
> The test suites reuse the single `MONGODB_URI` configuration. No separate test database URI (`MONGODB_TEST_URI`) or database re-configuration is required.

---

## 2. Testing Workflows

The testing architecture cleanly separates **offline unit tests** from **live MongoDB Atlas integration tests**.

### 2.1 Offline Unit Tests (Fast & Mocked)

Unit tests mock database queries via `jest.spyOn()` on Mongoose models. They run completely offline without requiring network access or live credentials.

```powershell
# Run unit tests
npm --prefix backend test

# Or via explicit alias
npm --prefix backend run test:unit
```

- **Execution Mode:** Offline, zero network traffic.
- **Coverage:** 9 test suites covering Auth, User, Board, List, Card, Card Movement Engine, Workspace, Health, and Request Validation.
- **Expected Result:** **183 passed** (~2.0 seconds).

---

### 2.2 Live MongoDB Atlas Integration Tests (Live Database)

Live integration tests exercise the full Express application stack against your real MongoDB Atlas cluster.

```powershell
# Run live Atlas integration tests
npm --prefix backend run test:integration
```

- **Execution Mode:** Sequential (`--runInBand`) against live MongoDB Atlas.
- **Coverage:** 2 test suites ([auth.integration.test.js](tests/integration/auth.integration.test.js) and [workspace.integration.test.js](tests/integration/workspace.integration.test.js)).
- **Tested Operations:**
  - Live user registration with bcrypt password hashing (`$2a$` / `$2b$`) in Atlas.
  - Native MongoDB unique index collision handling (`code 11000` mapped to HTTP `409 Conflict`).
  - Live password verification and JWT token issuance on login.
  - Profile retrieval (`GET /api/auth/me`) using JWT Bearer authentication.
  - Workspace creation with 12-character hexadecimal `inviteCode`.
  - Automatic `WorkspaceMember` creation with `role: "owner"`.
  - Live `.populate('owner')` document resolution on `GET /api/workspaces/:id`.
  - Cross-tenant authorization boundaries (unauthorized access rejected with HTTP `403 Forbidden`).
  - User workspace listing scoped to active memberships.
- **Expected Result:** **12 passed** (~6.0 seconds).

---

### 2.3 Running the Complete Test Suite

To run both the offline unit tests and live Atlas integration tests sequentially in a single pass:

```powershell
npm --prefix backend run test:all
```

- **Expected Result:** **195 passed** (183 unit + 12 integration).

---

## 3. Data Safety & Non-Destructive Isolation Architecture

Running automated integration tests against the same live database used for development requires strict safeguards to guarantee that pre-existing manual records (e.g., Postman users and workspaces) are **never deleted, modified, or corrupted**.

### 3.1 Unique Test Markers & Namespace Isolation

Every test run generates a cryptographically random session identifier (`runId = crypto.randomBytes(4).toString('hex')`):
- **Test Users:** `autotest.<runId>.<label>.<timestamp>.<entropy>@test-integration.internal`
- **Test Workspaces:** `[AUTOTEST-<runId>] <name>`

This guarantees zero naming or email collisions with manual development data.

### 3.2 Dual-Lock Scoped Cleanup

1. **Immediate In-Memory Registration:** Every created entity ID is registered immediately upon HTTP response receipt before any assertion can throw.
2. **Pre-Deletion Document Inspection:** Before any delete query is issued, the document is fetched from Atlas and its unique test markers are verified:
   - User emails must end with `@test-integration.internal` and contain the session `runId`.
   - Workspace names must start with `[AUTOTEST-<runId>]`.
   - If any document fails verification, the cleanup operation **aborts immediately** (`[SAFETY ABORT]`).
3. **Single-Document Deletion:** Deletions are executed strictly via single-document calls (`deleteOne({ _id })`).
4. **Dependency Order:** Cleanup executes in reverse dependency order:
   $$\text{WorkspaceMembers} \longrightarrow \text{Workspaces} \longrightarrow \text{Users}$$
   This ensures zero orphaned reference records.
5. **Zero Broad Deletions:** `dropDatabase()`, unrestricted `deleteMany()`, and wildcard sweeps are strictly prohibited.

### 3.3 Postman Record Preservation Checks

Before running any test assertions, the test harness captures a baseline snapshot of all pre-existing non-test records (`captureExistingState`).

At the conclusion of the test run, `verifyPreservation(baselineState)` explicitly queries Atlas to assert:
- Every pre-existing user and workspace still exists.
- Field values (`name`, `email`, `owner`) and creation timestamps remain identical.

### 3.4 Guaranteed Teardown Lifecycle

Teardown in `afterAll` uses nested `finally` blocks:
- Baseline preservation verification runs first.
- Scoped cleanup executes inside an inner `finally` block, guaranteeing cleanup runs even if assertions fail.
- Database disconnection (`disconnectDB()`) executes in the outermost `finally` block, ensuring Mongoose connections never hang.

---

## 4. Development Server

To launch the backend API server locally with hot-reloading:

```powershell
npm --prefix backend run dev
```

- **Local Base URL:** `http://localhost:5000/api`
- **Health Check Endpoint:** `GET http://localhost:5000/api/health`
- **Full API Documentation:** Refer to [docs/API_DOCUMENTATION.md](../docs/API_DOCUMENTATION.md).
