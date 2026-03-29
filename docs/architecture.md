# Architecture

## System diagram

```
┌──────────────────────────┐         ┌─────────────────────────────────┐
│  Browser (localhost:5173) │  HTTP   │  Express server (localhost:3001) │
│                          │ ──────> │                                 │
│  React + React Flow      │  SSE    │  ┌─ POST /api/chat             │
│  Zustand store           │ <────── │  │  spawn('claude', [...])      │
│  Vite dev server         │         │  │  spawn('codex', [...])       │
│                          │         │  │                              │
│  /api/* proxied to :3001 │         │  ├─ GET /api/graph              │
│  via vite.config.ts      │         │  │  read graph.json + *.md      │
│                          │         │  │                              │
└──────────────────────────┘         │  ├─ POST /api/save              │
                                     │  │  write graph.json + *.md     │
                                     │  │                              │
                                     │  ├─ POST /api/upload-image      │
                                     │  │  save to data/images/        │
                                     │  │                              │
                                     │  └─ GET /api/image/:filename    │
                                     │     serve from data/images/     │
                                     └─────────────────────────────────┘
```

## Project structure

```
ainstorm/
├── server/
│   └── index.ts              # Express server: CLI subprocess spawner,
│                              # file persistence, image uploads
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # ReactFlow canvas, controls, toolbar
│   ├── App.css               # All styles
│   │
│   ├── store/
│   │   └── useStore.ts       # Zustand store: nodes, edges, actions,
│   │                          # sendMessage, forkNode, persistence
│   ├── nodes/
│   │   ├── TextBoxNode.tsx   # Text box node component
│   │   ├── ChatBotNode.tsx   # Chat node component
│   │   └── nodeTypes.ts      # Node type registry
│   │
│   ├── components/
│   │   └── Toolbar.tsx       # Top-left toolbar (add nodes, default provider)
│   │
│   ├── lib/
│   │   ├── contextPropagation.ts  # Graph traversal, topological sort, cycle detection
│   │   ├── api.ts                 # Image upload helper
│   │   └── imageUtils.ts         # Clipboard image extraction
│   │
│   └── types/
│       └── index.ts          # TypeScript types for nodes, edges, messages
│
├── data/                     # Persistence (gitignored)
│   ├── graph.json
│   ├── nodes/*.md
│   └── images/*
│
├── vite.config.ts            # Vite config with /api proxy to :3001
├── package.json              # Scripts: dev, dev:client, dev:server
└── tsconfig.json
```

## Tech stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Canvas | React Flow (`@xyflow/react`) | Purpose-built for directed node graphs with handles, edges, connection validation |
| Frontend | React + TypeScript + Vite | Fast HMR, type safety |
| State | Zustand | Lightweight, React Flow recommended, no boilerplate |
| Backend | Express | Minimal — just spawns CLI subprocesses and does file I/O |
| AI | `claude` CLI / `codex` CLI | Uses existing Max/Codex subscriptions, no API costs |
| Persistence | Markdown + JSON | Human-readable, editable outside the app |

## Key design decisions

### CLI subprocesses over API SDK

The AI chat nodes spawn `claude -p` or `codex exec` as child processes rather than calling APIs directly. This was a deliberate choice:

- **No API costs** — the CLI uses your Claude Max / Codex subscription
- **No API keys** — the CLI handles its own authentication
- **Full model access** — whatever models your subscription includes

The trade-off is that each message spawns a new process, so there's no persistent conversation state within the CLI. Multi-turn context is handled by replaying the conversation history in each prompt.

### Zustand over Redux/Context

React Flow explicitly recommends Zustand for state management. It's ~1KB, has no boilerplate, and integrates naturally with React Flow's `applyNodeChanges` / `applyEdgeChanges` utilities.

### Markdown over database

Persistence uses plain files instead of SQLite or similar:
- Each node is one `.md` file — easy to read, edit, grep, or version control
- Graph structure is one `graph.json` — easy to inspect and debug
- No database to set up or migrate

### Vite proxy over CORS

The frontend calls `/api/*` which Vite proxies to the Express server on port 3001. This avoids CORS configuration and keeps API keys out of the browser.
