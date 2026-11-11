export const initialUsers = [
  {
    id: 'user-1',
    name: 'Alex Morgan',
    email: 'alex.morgan@syncflow.io',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'Lead Architect',
    department: 'Core Infrastructure',
    status: 'online',
    initials: 'AM',
    color: 'bg-indigo-600',
  },
  {
    id: 'user-2',
    name: 'Elena Rostova',
    email: 'elena.r@syncflow.io',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    role: 'Senior Frontend Engineer',
    department: 'Web Experience',
    status: 'online',
    initials: 'ER',
    color: 'bg-emerald-600',
  },
  {
    id: 'user-3',
    name: 'Marcus Chen',
    email: 'marcus.c@syncflow.io',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    role: 'Staff Backend Engineer',
    department: 'Distributed Systems',
    status: 'away',
    initials: 'MC',
    color: 'bg-amber-600',
  },
  {
    id: 'user-4',
    name: 'Sophia Taylor',
    email: 'sophia.t@syncflow.io',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    role: 'Lead Product Designer',
    department: 'Product Design',
    status: 'online',
    initials: 'ST',
    color: 'bg-purple-600',
  },
  {
    id: 'user-5',
    name: 'David Kim',
    email: 'david.k@syncflow.io',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    role: 'Principal Product Manager',
    department: 'Product Management',
    status: 'offline',
    initials: 'DK',
    color: 'bg-blue-600',
  },
  {
    id: 'user-6',
    name: 'Rachel Green',
    email: 'rachel.g@syncflow.io',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    role: 'QA Automation Lead',
    department: 'Quality Engineering',
    status: 'online',
    initials: 'RG',
    color: 'bg-rose-600',
  }
];

export const initialWorkspaces = [
  {
    id: 'ws-1',
    name: 'Acme Cloud Platform',
    code: 'ACME',
    icon: 'Layers',
    role: 'Admin',
    membersCount: 24,
    plan: 'Enterprise',
  },
  {
    id: 'ws-2',
    name: 'PulseSync Core',
    code: 'PULSE',
    icon: 'Zap',
    role: 'Owner',
    membersCount: 16,
    plan: 'Pro',
  },
  {
    id: 'ws-3',
    name: 'FinTech Labs',
    code: 'FTL',
    icon: 'ShieldCheck',
    role: 'Member',
    membersCount: 8,
    plan: 'Team',
  }
];

export const initialProjects = [
  {
    id: 'proj-1',
    workspaceId: 'ws-2',
    name: 'PulseSync Core Engine',
    key: 'ENG',
    description: 'Real-time WebSocket event bus, optimistic UI sync, and sub-20ms Redis distributed state layer.',
    status: 'active',
    category: 'Infrastructure',
    color: '#6366f1',
    progress: 74,
    leadId: 'user-1',
    teamIds: ['user-1', 'user-2', 'user-3', 'user-4'],
    sprint: 'Sprint 24',
    dueDate: '2026-11-20',
    starred: true,
  },
  {
    id: 'proj-2',
    workspaceId: 'ws-2',
    name: 'Mobile App React Native 2.0',
    key: 'MOB',
    description: 'Cross-platform iOS and Android client with offline-first sync cache and biometric sign-in.',
    status: 'active',
    category: 'Mobile',
    color: '#0ea5e9',
    progress: 48,
    leadId: 'user-2',
    teamIds: ['user-2', 'user-5', 'user-6'],
    sprint: 'Sprint 11',
    dueDate: '2026-12-05',
    starred: true,
  },
  {
    id: 'proj-3',
    workspaceId: 'ws-2',
    name: 'Design System & UI Component Library',
    key: 'DS',
    description: 'Tokenized atomic design components with WCAG AAA accessibility and high-contrast dark themes.',
    status: 'active',
    category: 'Design',
    color: '#ec4899',
    progress: 91,
    leadId: 'user-4',
    teamIds: ['user-4', 'user-2'],
    sprint: 'Sprint 8',
    dueDate: '2026-11-15',
    starred: false,
  },
  {
    id: 'proj-4',
    workspaceId: 'ws-2',
    name: 'Enterprise Security & Compliance',
    key: 'SEC',
    description: 'SOC2 Type II telemetry pipeline, SAML/SSO enforcement, and end-to-end payload encryption.',
    status: 'planning',
    category: 'Security',
    color: '#10b981',
    progress: 25,
    leadId: 'user-3',
    teamIds: ['user-1', 'user-3', 'user-6'],
    sprint: 'Sprint 1',
    dueDate: '2027-01-15',
    starred: false,
  }
];

export const initialTasks = [
  {
    id: 'task-101',
    key: 'ENG-342',
    projectId: 'proj-1',
    title: 'Migrate WebSocket heartbeats to zero-allocation binary frames',
    description: 'Optimize high-concurrency connection pools to support up to 50k concurrent connected clients with low garbage collection pressure.',
    status: 'in_progress',
    priority: 'urgent',
    assigneeId: 'user-1',
    storyPoints: 5,
    tags: ['WebSocket', 'Performance', 'Redis'],
    dueDate: '2026-11-10',
    createdAt: '2026-11-01',
    subtasks: [
      { id: 'st-1', title: 'Benchmark current JSON frame serialization', done: true },
      { id: 'st-2', title: 'Implement MessagePack / Protobuf binary protocol', done: true },
      { id: 'st-3', title: 'Verify reconnection backoff jitter in staging', done: false }
    ],
    comments: [
      {
        id: 'c-1',
        userId: 'user-3',
        content: 'Benchmarked the payload size: dropped from 480 bytes to 72 bytes per heartbeat frame. Huge win!',
        createdAt: '2026-11-04T10:30:00Z'
      },
      {
        id: 'c-2',
        userId: 'user-1',
        content: 'Great result Marcus! Pull request #89 is open for final review.',
        createdAt: '2026-11-04T11:15:00Z'
      }
    ]
  },
  {
    id: 'task-102',
    key: 'ENG-343',
    projectId: 'proj-1',
    title: 'Design optimistic local mutation rollback in Kanban store',
    description: 'Ensure drag-and-drop operations visually update instantly on the board and silently rollback with a non-intrusive toast if the sync layer fails.',
    status: 'todo',
    priority: 'high',
    assigneeId: 'user-2',
    storyPoints: 8,
    tags: ['Frontend', 'Zustand', 'UX'],
    dueDate: '2026-11-12',
    createdAt: '2026-11-02',
    subtasks: [
      { id: 'st-4', title: 'Implement snapshot buffer prior to drag drop', done: true },
      { id: 'st-5', title: 'Hook into global error dispatcher', done: false },
      { id: 'st-6', title: 'Write integration test with simulated network lag', done: false }
    ],
    comments: [
      {
        id: 'c-3',
        userId: 'user-4',
        content: 'Please make sure the dragged card retains its tilt shadow during the animation.',
        createdAt: '2026-11-03T14:20:00Z'
      }
    ]
  },
  {
    id: 'task-103',
    key: 'ENG-344',
    projectId: 'proj-1',
    title: 'Configure automated Redis Cluster failover in staging cluster',
    description: 'Add Sentinel replication monitoring and automated health checks for leader election during pod evictions.',
    status: 'in_review',
    priority: 'high',
    assigneeId: 'user-3',
    storyPoints: 5,
    tags: ['DevOps', 'Redis', 'Kubernetes'],
    dueDate: '2026-11-08',
    createdAt: '2026-10-28',
    subtasks: [
      { id: 'st-7', title: 'Define Helm values for multi-zone Sentinel pods', done: true },
      { id: 'st-8', title: 'Test split-brain tolerance scenarios', done: true }
    ],
    comments: []
  },
  {
    id: 'task-104',
    key: 'ENG-345',
    projectId: 'proj-1',
    title: 'Audit WCAG 2.1 AA keyboard focus indicators for interactive tables',
    description: 'Verify focus rings are clearly visible across all dark mode and high contrast themes without breaking border radii.',
    status: 'completed',
    priority: 'medium',
    assigneeId: 'user-4',
    storyPoints: 3,
    tags: ['A11y', 'Design System'],
    dueDate: '2026-11-04',
    createdAt: '2026-10-26',
    subtasks: [
      { id: 'st-9', title: 'Inspect tab index order on board view', done: true },
      { id: 'st-10', title: 'Add outline-offset ring styling', done: true }
    ],
    comments: [
      {
        id: 'c-4',
        userId: 'user-6',
        content: 'QA certified on Chrome, Firefox and Safari with screen reader NVDA.',
        createdAt: '2026-11-04T16:00:00Z'
      }
    ]
  },
  {
    id: 'task-105',
    key: 'ENG-346',
    projectId: 'proj-1',
    title: 'Implement Command Palette (Cmd+K) quick actions and global search',
    description: 'Fuzzy search across active sprint tasks, team members, recent boards, and global system toggles like theme and workspace switcher.',
    status: 'in_progress',
    priority: 'urgent',
    assigneeId: 'user-2',
    storyPoints: 5,
    tags: ['Frontend', 'Search', 'Hotkeys'],
    dueDate: '2026-11-09',
    createdAt: '2026-11-03',
    subtasks: [
      { id: 'st-11', title: 'Global keydown listener with modifier prevention', done: true },
      { id: 'st-12', title: 'Fuzzy match scoring algorithm', done: true },
      { id: 'st-13', title: 'Recent searches in localStorage', done: false }
    ],
    comments: []
  },
  {
    id: 'task-106',
    key: 'ENG-347',
    projectId: 'proj-1',
    title: 'Real-time multi-user cursor presence and live avatar indicators',
    description: 'Display which teammates are currently viewing the same sprint board with subtle colored status rings and live card updates.',
    status: 'todo',
    priority: 'medium',
    assigneeId: 'user-1',
    storyPoints: 8,
    tags: ['Presence', 'RealTime', 'Socket.io'],
    dueDate: '2026-11-14',
    createdAt: '2026-11-04',
    subtasks: [
      { id: 'st-14', title: 'Presence channel ephemeral pub/sub', done: false },
      { id: 'st-15', title: 'Avatar stack with tooltip details', done: false }
    ],
    comments: []
  },
  {
    id: 'task-107',
    key: 'ENG-348',
    projectId: 'proj-1',
    title: 'Build sprint burndown velocity and story point burnup charts',
    description: 'Render interactive Recharts area and bar components comparing ideal burn curve vs actual completion trajectory.',
    status: 'in_review',
    priority: 'high',
    assigneeId: 'user-5',
    storyPoints: 5,
    tags: ['Analytics', 'Charts', 'Recharts'],
    dueDate: '2026-11-07',
    createdAt: '2026-10-30',
    subtasks: [
      { id: 'st-16', title: 'Story point aggregation by day', done: true },
      { id: 'st-17', title: 'Custom tooltip formatter for Recharts', done: true },
      { id: 'st-18', title: 'Export chart to PNG / CSV', done: false }
    ],
    comments: []
  },
  {
    id: 'task-108',
    key: 'ENG-349',
    projectId: 'proj-1',
    title: 'Automated end-to-end Cypress regression suite for task creation',
    description: 'Cover full life-cycle: task draft -> priority selection -> tag assignment -> drag column transition -> comment thread addition.',
    status: 'todo',
    priority: 'low',
    assigneeId: 'user-6',
    storyPoints: 3,
    tags: ['QA', 'Automation', 'E2E'],
    dueDate: '2026-11-18',
    createdAt: '2026-11-02',
    subtasks: [],
    comments: []
  },
  {
    id: 'task-109',
    key: 'ENG-350',
    projectId: 'proj-1',
    title: 'Deliver Dark/Light mode theme system with persistent preferences',
    description: 'Seamless CSS variable tokens for dark high-contrast and light crisp modern SaaS aesthetics without flash of unstyled theme.',
    status: 'completed',
    priority: 'medium',
    assigneeId: 'user-4',
    storyPoints: 3,
    tags: ['Tailwind', 'Design System', 'UI'],
    dueDate: '2026-11-03',
    createdAt: '2026-10-25',
    subtasks: [
      { id: 'st-19', title: 'Setup Tailwind dark: class tokens', done: true },
      { id: 'st-20', title: 'Persist in localStorage with system preference fallback', done: true }
    ],
    comments: []
  }
];

export const initialActivities = [
  {
    id: 'act-1',
    userId: 'user-1',
    type: 'task_moved',
    target: 'ENG-342',
    details: 'moved task from In Progress to In Review',
    time: '2 minutes ago',
    timestamp: '2026-11-05T10:20:00Z'
  },
  {
    id: 'act-2',
    userId: 'user-2',
    type: 'task_created',
    target: 'ENG-346',
    details: 'created new issue "Implement Command Palette (Cmd+K)"',
    time: '18 minutes ago',
    timestamp: '2026-11-05T10:04:00Z'
  },
  {
    id: 'act-3',
    userId: 'user-3',
    type: 'pr_merged',
    target: 'PR #142',
    details: 'merged Redis failover Sentinel configurations into main',
    time: '1 hour ago',
    timestamp: '2026-11-05T09:22:00Z'
  },
  {
    id: 'act-4',
    userId: 'user-4',
    type: 'comment_added',
    target: 'ENG-343',
    details: 'commented on card tilt animation specifications',
    time: '2 hours ago',
    timestamp: '2026-11-05T08:15:00Z'
  },
  {
    id: 'act-5',
    userId: 'user-6',
    type: 'task_completed',
    target: 'ENG-345',
    details: 'marked WCAG 2.1 AA focus indicators as Completed',
    time: '4 hours ago',
    timestamp: '2026-11-05T06:30:00Z'
  }
];

export const initialNotifications = [
  {
    id: 'notif-1',
    title: 'Marcus Chen mentioned you',
    message: 'Alex, could you review the Redis Cluster failover Sentinel configs in PR #142?',
    time: '12m ago',
    read: false,
    type: 'mention',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    link: '/board?task=task-103'
  },
  {
    id: 'notif-2',
    title: 'Sprint 24 Goal Milestone Reached',
    message: '74% of planned story points completed with 4 days remaining.',
    time: '1h ago',
    read: false,
    type: 'milestone',
    avatar: null,
    link: '/dashboard'
  },
  {
    id: 'notif-3',
    title: 'Task Assigned',
    message: 'Sophia Taylor assigned you to "Design optimistic local mutation rollback".',
    time: '3h ago',
    read: true,
    type: 'assignment',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    link: '/board?task=task-102'
  },
  {
    id: 'notif-4',
    title: 'Security Alert Fixed',
    message: 'Automated dependency audit resolved 2 moderate vulnerabilities.',
    time: 'Yesterday',
    read: true,
    type: 'security',
    avatar: null,
    link: '/settings'
  }
];

export const sprintBurndownData = [
  { day: 'Day 1', ideal: 45, actual: 45 },
  { day: 'Day 2', ideal: 40, actual: 44 },
  { day: 'Day 3', ideal: 36, actual: 39 },
  { day: 'Day 4', ideal: 32, actual: 35 },
  { day: 'Day 5', ideal: 27, actual: 29 },
  { day: 'Day 6', ideal: 22, actual: 22 },
  { day: 'Day 7', ideal: 18, actual: 16 },
  { day: 'Day 8', ideal: 13, actual: 12 },
  { day: 'Day 9 (Today)', ideal: 9, actual: 7 },
  { day: 'Day 10', ideal: 4, actual: null },
  { day: 'Day 11', ideal: 0, actual: null }
];

export const sprintVelocityData = [
  { sprint: 'Sprint 20', committed: 38, completed: 36 },
  { sprint: 'Sprint 21', committed: 42, completed: 44 },
  { sprint: 'Sprint 22', committed: 45, completed: 40 },
  { sprint: 'Sprint 23', committed: 48, completed: 50 },
  { sprint: 'Sprint 24', committed: 45, completed: 38 },
];

