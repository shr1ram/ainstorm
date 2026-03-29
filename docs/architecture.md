# Architecture

## System diagram

```
┌──────────────────────────┐         ┌─────────────────────────────────┐
│  Browser (localhost:5173) │  HTTP   │  Express server (localhost:3001) │
│                          │ ──────> │                                 │
│  React + React Flow      │  SSE    │  ┌─ POST /api/chat             │
│  Zustand store           │ <────── │  │  spawn claude/codex CLI      │
│  Vite dev server         │         │  │  mode=chat: WebSearch,WebFetch│
│                          │         │  │  mode=code: all tools         │
│  /api/* proxied to :3001 │         │  │                              │
│  via vite.config.ts      │         │  ├─ GET /api/graph              │
│                          │         │  │  read graph.json + *.md      │
│                          │         │  │                              │
│                          │         │  ├─ POST /api/save              │
│                          │         │  │  write graph.json + *.md     │
│                          │         │  │                              │
│                          │         │  ├─ POST /api/upload-image      │
│                          │         │  │  save to data/images/        │
│                          │         │  │                              │
│                          │         │  ├─ POST /api/upload-file       │
│                          │         │  │  save to data/files/         │
│                          │         │  │  extract PDF text via pdf-parse│
│                          │         │  │                              │
│                          │         │  ├─ GET /api/image/:filename    │
│                          │         │  │  serve from data/images/     │
│                          │         │  │                              │
│                          │         │  └─ GET /api/file/:filename     │
│                          │         │     serve from data/files/      │
└──────────────────────────┘         └─────────────────────────────────┘
```

## Project structure

```
ainstorm/
├── server/
│   └── index.ts              # Express server: CLI subprocess spawner,
│                              # file persistence, image/file uploads,
│                              # PDF text extraction
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # ReactFlow canvas, controls, toolbar
│   ├── App.css               # All styles
│   │
│   ├── store/
│   │   └── useStore.ts       # Zustand store: nodes, edges, actions,
│   │                          # sendMessage, forkNode, persistence,
│   │                          # chat/code system prompts
│   ├── nodes/
│   │   ├── TextBoxNode.tsx   # Text box node component
│   │   ├── ChatBotNode.tsx   # Chat node component (web search enabled)
│   │   ├── CodeBoxNode.tsx   # Code agent node component (all tools)
│   │   ├── FileBoxNode.tsx   # File box node component (images + PDFs)
│   │   └── nodeTypes.ts      # Node type registry
│   │
│   ├── components/
│   │   └── Toolbar.tsx       # Top-left toolbar (add nodes, default
│   │                          # provider, font size control)
│   ├── lib/
│   │   ├── contextPropagation.ts  # Graph traversal, topological sort,
│   │   │                           # cycle detection
│   │   ├── api.ts                 # Image upload helper
│   │   └── imageUtils.ts         # Clipboard image extraction
│   │
│   └── types/
│       └── index.ts          # TypeScript types for all node types
│
├── data/                     # Persistence (gitignored)
│   ├── graph.json
│   ├── nodes/*.md
│   ├── images/*
│   └── files/*               # Uploaded PDFs and images from File Box
│
├── docs/                     # Documentation
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
| PDF | pdf-parse | Server-side PDF text extraction |
| Markdown | react-markdown | Renders markdown in chat/code message bubbles |
| Persistence | Markdown + JSON | Human-readable, editable outside the app |

## Key design decisions

### CLI subprocesses over API SDK

The AI nodes spawn `claude -p` or `codex exec` as child processes rather than calling APIs directly:

- **No API costs** — the CLI uses your Claude Max / Codex subscription
- **No API keys** — the CLI handles its own authentication
- **Full model access** — whatever models your subscription includes

Each message spawns a new process. Multi-turn context is handled by replaying the conversation history in each prompt.

### Chat mode vs Code mode

The `--tools` flag controls what each node type can do:

- **Chat Box**: `--tools WebSearch,WebFetch` — can search the web and fetch pages, but cannot read files, run commands, or edit anything
- **Code Box**: `--tools default` — full access to all tools (Bash, Edit, Read, Write, Grep, etc.)

### Large system prompts

When upstream context is large (>10,000 characters, e.g. from PDF extraction), the system prompt is written to a temp file and passed via `--system-prompt-file` instead of as a CLI argument, to avoid shell argument length limits. The temp file is cleaned up after the process exits.

### Zustand over Redux/Context

React Flow explicitly recommends Zustand. It's ~1KB, has no boilerplate, and integrates naturally with React Flow's `applyNodeChanges` / `applyEdgeChanges` utilities.

### Markdown over database

Persistence uses plain files instead of SQLite or similar:
- Each node is one `.md` file — easy to read, edit, grep, or version control
- Graph structure is one `graph.json` — easy to inspect and debug
- No database to set up or migrate

### Vite proxy over CORS

The frontend calls `/api/*` which Vite proxies to the Express server on port 3001. This avoids CORS configuration and keeps API keys out of the browser.
