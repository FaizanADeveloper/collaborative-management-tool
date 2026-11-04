# Real-Time Collaborative Workspace (Agile Management Tool)

A robust project management tool analogous to Jira or Trello, facilitating agile team workflows through Kanban boards, real-time task updates, collaborative document editing, and team communication.

## Monorepo Architecture

```
collaborative-management-tool/
├── backend/                  # Node.js, Express.js, MongoDB Atlas backend
│   ├── src/
│   │   ├── config/           # Database and environment configurations
│   │   ├── controllers/      # HTTP request handlers
│   │   ├── middleware/       # Custom middleware (Auth, RBAC, Error handling)
│   │   ├── models/           # Mongoose schemas and data models
│   │   ├── routes/           # Express API endpoints
│   │   ├── services/         # Core business logic
│   │   ├── utils/            # Utility functions and custom error classes
│   │   └── validators/       # Input validation schemas
│   └── tests/                # Unit and integration test suites
├── docs/                     # Specifications and architectural documentation
│   └── PROJECT_BRIEF.pdf     # Official project brief
└── frontend/                 # React.js, Tailwind CSS, React Beautiful DnD client
```

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB (via Mongoose), MongoDB Atlas
- **Real-Time Engine:** Socket.io
- **Security:** JWT, bcryptjs, Role-Based Access Control (RBAC)
- **Frontend (Upcoming):** React.js, Tailwind CSS, Context API / Zustand, React Beautiful DnD

## Documentation

Refer to [PROJECT_BRIEF.pdf](docs/PROJECT_BRIEF.pdf) for the complete 4-week development roadmap and system specifications.

