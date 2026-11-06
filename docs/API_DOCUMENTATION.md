# REST API Documentation & Frontend Handover Specification
## Real-Time Collaborative Workspace (Agile Management Tool) — Weeks 1 & 2

This document provides the complete API contract, authentication workflows, request/response models, authorization rules, and frontend integration guidelines for the **Real-Time Collaborative Workspace** backend.

---

## 1. Architecture & Protocol Standards

### Base URL
- Local Development: `http://localhost:5000/api`
- Content-Type: `application/json` (all requests and responses)

### Standard Response Envelope
All successful API responses return HTTP status `200` or `201` with a standardized envelope:

```json
{
  "success": true,
  "status": "success",
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Standard Error Envelope
All error responses return standard HTTP error status codes (`400`, `401`, `403`, `404`, `409`, `500`) with a standardized error envelope:

```json
{
  "success": false,
  "status": "fail",
  "message": "Validation Error",
  "errors": [
    {
      "field": "title",
      "message": "Card title is required"
    }
  ]
}
```

### Authentication Header
Protected endpoints require a valid JWT Bearer token supplied in the `Authorization` HTTP header:

```http
Authorization: Bearer <jwt_access_token>
```

### Serialization & ID Handling
- MongoDB `_id` is transformed to string `id` on all JSON outputs.
- Internal version keys (`__v`) and password hashes are automatically stripped.

---

## 2. Environment Configuration & Setup

### Environment Variables (`backend/.env`)
```ini
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/collaborative-management-tool
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

### Starting the Backend
```powershell
# Install dependencies
npm --prefix backend install

# Run offline unit tests (183 tests)
npm --prefix backend test

# Run live MongoDB Atlas integration tests (12 tests)
npm --prefix backend run test:integration

# Run complete test suite (195 tests)
npm --prefix backend run test:all

# Run development server with auto-reload
npm --prefix backend run dev
```

---

## 3. Authentication & User Profile APIs

### 3.1 Register User
- **Route:** `POST /api/auth/register`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "Password123",
    "avatar": "https://example.com/avatar.png"
  }
  ```
- **Response:** `HTTP 201 Created`
  ```json
  {
    "success": true,
    "status": "success",
    "message": "User registered successfully",
    "data": {
      "user": {
        "id": "6729e1c1...",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "avatar": "https://example.com/avatar.png",
        "createdAt": "2026-11-05T12:00:00.000Z",
        "updatedAt": "2026-11-05T12:00:00.000Z"
      },
      "token": "eyJhbGciOi..."
    }
  }
  ```

### 3.2 Login User
- **Route:** `POST /api/auth/login`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "email": "jane@example.com",
    "password": "Password123"
  }
  ```
- **Response:** `HTTP 200 OK`
  ```json
  {
    "success": true,
    "status": "success",
    "message": "Login successful",
    "data": {
      "user": {
        "id": "6729e1c1...",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "avatar": "https://example.com/avatar.png"
      },
      "token": "eyJhbGciOi..."
    }
  }
  ```

### 3.3 Get Current User Profile
- **Route:** `GET /api/auth/me`
- **Auth:** Bearer Token
- **Response:** `HTTP 200 OK`
  ```json
  {
    "success": true,
    "status": "success",
    "message": "User profile retrieved successfully",
    "data": {
      "user": {
        "id": "6729e1c1...",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "avatar": "https://example.com/avatar.png"
      }
    }
  }
  ```

---

## 4. Workspace Management & Membership APIs

### 4.1 Create Workspace
- **Route:** `POST /api/workspaces`
- **Auth:** Bearer Token
- **Request Body:**
  ```json
  {
    "name": "Engineering Team",
    "description": "Primary workspace for engineering initiatives"
  }
  ```
- **Response:** `HTTP 201 Created`
  ```json
  {
    "success": true,
    "status": "success",
    "message": "Workspace created successfully",
    "data": {
      "workspace": {
        "id": "6729e2f0...",
        "name": "Engineering Team",
        "description": "Primary workspace for engineering initiatives",
        "owner": "6729e1c1...",
        "inviteCode": "8e4d29f0ab12",
        "role": "owner"
      }
    }
  }
  ```

### 4.2 List Accessible Workspaces
- **Route:** `GET /api/workspaces`
- **Auth:** Bearer Token
- **Response:** `HTTP 200 OK` (returns all workspaces where user is owner, admin, or member)
  ```json
  {
    "success": true,
    "status": "success",
    "message": "Workspaces retrieved successfully",
    "data": {
      "workspaces": [
        {
          "id": "6729e2f0...",
          "name": "Engineering Team",
          "description": "Primary workspace",
          "owner": "6729e1c1...",
          "role": "owner",
          "joinedAt": "2026-11-05T12:00:00.000Z"
        }
      ]
    }
  }
  ```

### 4.3 Get Workspace Details by ID
- **Route:** `GET /api/workspaces/:id`
- **Auth:** Bearer Token (must be a workspace member)
- **Response:** `HTTP 200 OK`

### 4.4 Get Workspace Members
- **Route:** `GET /api/workspaces/:id/members`
- **Auth:** Bearer Token (must be a workspace member)
- **Response:** `HTTP 200 OK`
  ```json
  {
    "success": true,
    "status": "success",
    "message": "Workspace members retrieved successfully",
    "data": {
      "members": [
        {
          "id": "6729e1c1...",
          "name": "Jane Doe",
          "email": "jane@example.com",
          "avatar": "https://example.com/avatar.png",
          "role": "owner",
          "joinedAt": "2026-11-05T12:00:00.000Z"
        }
      ]
    }
  }
  ```

### 4.5 Update Workspace Metadata
- **Route:** `PUT /api/workspaces/:id`
- **Auth:** Bearer Token (workspace `owner` or `admin` only)
- **Request Body:**
  ```json
  {
    "name": "Core Engineering Hub",
    "description": "Updated description"
  }
  ```
- **Response:** `HTTP 200 OK`

### 4.6 Delete Workspace
- **Route:** `DELETE /api/workspaces/:id`
- **Auth:** Bearer Token (workspace `owner` only)
- **Cascading Impact:** Cascades deletion of all child boards, lists, cards, and workspace memberships.
- **Response:** `HTTP 200 OK` with `data: null`

### 4.7 Generate / Refresh Workspace Invitation Code
- **Route:** `POST /api/workspaces/:id/invite`
- **Auth:** Bearer Token (workspace `owner` or `admin` only)
- **Response:** `HTTP 200 OK`
  ```json
  {
    "success": true,
    "status": "success",
    "message": "Invitation code generated successfully",
    "data": {
      "inviteCode": "f3b89012cd4e"
    }
  }
  ```

### 4.8 Join Workspace via Invitation Code
- **Route:** `POST /api/workspaces/join/:inviteCode`
- **Auth:** Bearer Token
- **Response:** `HTTP 200 OK` (assigned `member` role; returns 409 if already a member)

### 4.9 Remove Member or Leave Workspace
- **Route:** `DELETE /api/workspaces/:id/members/:userId`
- **Auth:** Bearer Token
- **Rules:**
  - Members can leave on their own (unless owner).
  - Owner or admin can remove regular members.
  - Admins cannot remove other admins or the owner.
  - Owner cannot leave without transferring ownership or deleting the workspace.
- **Response:** `HTTP 200 OK` with `data: null`

---

## 5. Board APIs

### 5.1 Create Board
- **Route:** `POST /api/workspaces/:workspaceId/boards`
- **Auth:** Bearer Token (must be a member of the workspace)
- **Request Body:**
  ```json
  {
    "name": "Sprint 14 Kanban",
    "description": "Two-week agile sprint board"
  }
  ```
- **Response:** `HTTP 201 Created`

### 5.2 List Boards in Workspace
- **Route:** `GET /api/workspaces/:workspaceId/boards`
- **Auth:** Bearer Token (must be a member of the workspace)
- **Response:** `HTTP 200 OK` with `{ boards: [...] }`

### 5.3 Get Board Details by ID
- **Route:** `GET /api/boards/:id`
- **Auth:** Bearer Token (must be a member of the workspace)
- **Response:** `HTTP 200 OK` with `{ board: ... }`

### 5.4 Update Board
- **Route:** `PUT /api/boards/:id`
- **Auth:** Bearer Token (workspace owner, admin, or board creator only)
- **Request Body:**
  ```json
  {
    "name": "Sprint 14 Kanban (Active)",
    "description": "Updated sprint board description"
  }
  ```
- **Response:** `HTTP 200 OK` with `{ board: ... }`

### 5.5 Delete Board
- **Route:** `DELETE /api/boards/:id`
- **Auth:** Bearer Token (workspace owner, admin, or board creator only)
- **Cascading Impact:** Cascades deletion of all child lists and cards.
- **Response:** `HTTP 200 OK` with `data: null`

---

## 6. List APIs

### 6.1 Create List
- **Route:** `POST /api/boards/:boardId/lists`
- **Auth:** Bearer Token (workspace member)
- **Positioning Strategy:**
  - When `position` is omitted, automatically calculated as `highest + 1000` (or `1000` if list is empty).
  - An explicit numeric `position` can also be supplied.
- **Request Body:**
  ```json
  {
    "name": "In Progress"
  }
  ```
- **Response:** `HTTP 201 Created`

### 6.2 Get Board Lists
- **Route:** `GET /api/boards/:boardId/lists`
- **Auth:** Bearer Token (workspace member)
- **Deterministic Ordering:** Sorted server-side by `{ position: 1, createdAt: 1 }`.
- **Response:** `HTTP 200 OK` with `{ lists: [...] }`

### 6.3 Update List Name or Position
- **Route:** `PATCH /api/lists/:id` or `PUT /api/lists/:id`
- **Auth:** Bearer Token (workspace member)
- **Request Body:**
  ```json
  {
    "name": "Under Code Review",
    "position": 2500
  }
  ```
- **Response:** `HTTP 200 OK` with `{ list: ... }`

### 6.4 Delete List
- **Route:** `DELETE /api/lists/:id`
- **Auth:** Bearer Token (workspace member)
- **Cascading Impact:** Cascades deletion of all cards belonging to the list.
- **Response:** `HTTP 200 OK` with `data: null`

---

## 7. Card APIs & Movement Engine

### 7.1 Create Card
- **Route:** `POST /api/lists/:listId/cards`
- **Auth:** Bearer Token (workspace member)
- **Request Body:**
  ```json
  {
    "title": "Build Authentication Middleware",
    "description": "Verify Bearer JWT and inject user into request context",
    "priority": "high",
    "assignees": ["6729e1c1..."],
    "dueDate": "2026-11-20T18:00:00.000Z",
    "labels": ["backend", "security"]
  }
  ```
- **Priority Enum Options:** `"low"`, `"medium"`, `"high"`, `"urgent"` (defaults to `"medium"`).
- **Auto-Positioning:** Calculates position as `highest + 1000` (default 1000 if empty).
- **Response:** `HTTP 201 Created` with `{ card: ... }`

### 7.2 Get All Cards in a List
- **Route:** `GET /api/lists/:listId/cards`
- **Auth:** Bearer Token (workspace member)
- **Ordering:** Sorted server-side by `{ position: 1, createdAt: 1 }`.
- **Response:** `HTTP 200 OK` with `{ cards: [...] }`

### 7.3 Get Card Details by ID
- **Route:** `GET /api/cards/:id`
- **Auth:** Bearer Token (workspace member)
- **Populated Fields:** `assignees` populated with `{ id, name, email, avatar }`.
- **Response:** `HTTP 200 OK` with `{ card: ... }`

### 7.4 Update Card Details
- **Route:** `PATCH /api/cards/:id` or `PUT /api/cards/:id`
- **Auth:** Bearer Token (workspace member)
- **Request Body (Partial Update Supported):**
  ```json
  {
    "title": "Refactor Authentication Middleware",
    "priority": "urgent",
    "dueDate": "2026-11-25T18:00:00.000Z",
    "labels": ["backend", "refactor"]
  }
  ```
- **Response:** `HTTP 200 OK` with `{ card: ... }`

### 7.5 Delete Card
- **Route:** `DELETE /api/cards/:id`
- **Auth:** Bearer Token (workspace member)
- **Response:** `HTTP 200 OK` with `data: null`

### 7.6 Move Card & Reorder (Drag-and-Drop Endpoint)
- **Route:** `PATCH /api/cards/:id/move`
- **Auth:** Bearer Token (workspace member)
- **Cross-Board Isolation:** Destination list MUST belong to the same board as the card. Cross-board movement is rejected with HTTP 400.
- **Request Body:**
  ```json
  {
    "destinationListId": "6729e4a1...",
    "position": 1500
  }
  ```
- **Response:** `HTTP 200 OK` with `{ card: ... }`

---

## 8. Frontend Integration & Drag-and-Drop Guidelines

### 8.1 Positioning & Ordering Strategy for Frontend Developers
1. **Initial Spacing:** Cards and lists are generated with generous spacing (`1000, 2000, 3000, ...`).
2. **Moving Between Two Cards:**
   - When dropping a card between Card A (position `1000`) and Card B (position `2000`), the frontend should calculate the midpoint:
     $$\text{newPosition} = \frac{\text{pos}_A + \text{pos}_B}{2} = 1500$$
3. **Moving to the Top of a List:**
   - If dropped above the first card (position `1000`), send $\text{newPosition} = \frac{\text{pos}_{\text{first}}}{2} = 500$ (or $\text{pos}_{\text{first}} - 1000$, with a minimum of $0$).
4. **Moving to the Bottom of a List:**
   - If dropped after the last card (position `4000`), send $\text{newPosition} = \text{pos}_{\text{last}} + 1000 = 5000$.
5. **Moving into an Empty List:**
   - Send `destinationListId` and `position: 1000`.

### 8.2 Optimistic UI Updates & Error Rollbacks
1. Upon user drop event in `react-beautiful-dnd`, update the local React state immediately so the card snaps into position smoothly.
2. Fire the asynchronous request: `PATCH /api/cards/:id/move`.
3. If the server returns a failure status (`4xx` or `5xx`), catch the error and revert local state to the pre-drag snapshot, displaying a toast notification to the user.

### 8.3 Outstanding Frontend Scope (Week 1 & Week 2)
The frontend branch is currently maintained separately and has not yet been integrated into the repository. The following frontend components will consume these APIs upon frontend integration:
- Responsive layout and sidebar navigation.
- Workspace settings, member management, and invite link copy UI.
- Interactive Kanban Board with React Beautiful DnD drag-and-drop.
- Card modal for editing assignees, priorities, due dates, and labels.
- Local state caching and optimistic UI updates.
