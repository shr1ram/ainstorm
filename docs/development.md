# Development Guide

## Setup

```bash
git clone https://github.com/shr1ram/ainstorm.git
cd ainstorm
npm install
```

## Running

```bash
npm run dev
```

This runs two processes via `concurrently`:
- `npm run dev:client` — Vite dev server on port 5173
- `npm run dev:server` — Express server on port 3001 (via `tsx watch` for hot reload)

The Vite config proxies `/api/*` requests to port 3001.

## Prerequisites

- Node.js v18+
- `claude` CLI installed and authenticated (Claude Max subscription)
- `codex` CLI installed and authenticated (Codex subscription, optional)

No `.env` file or API keys needed — the CLIs handle their own auth.

## Project layout

| Path | Purpose |
|------|---------|
| `server/index.ts` | Express backend — CLI spawning, file I/O, image uploads |
| `src/store/useStore.ts` | Zustand store — all state and actions |
| `src/nodes/TextBoxNode.tsx` | Text node component |
| `src/nodes/ChatBotNode.tsx` | Chat node component |
| `src/lib/contextPropagation.ts` | Graph traversal algorithm |
| `src/App.tsx` | React Flow canvas setup |
| `src/App.css` | All styles (single file) |

## API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/graph` | Load graph + node content from disk |
| POST | `/api/save` | Save graph + node content to disk |
| POST | `/api/chat` | Spawn CLI subprocess, stream response as SSE |
| POST | `/api/upload-image` | Upload image file to `data/images/` |
| GET | `/api/image/:filename` | Serve an uploaded image |

## Adding a new node type

1. Create `src/nodes/MyNode.tsx` — use `TextBoxNode.tsx` as a template
2. Add it to `src/nodes/nodeTypes.ts`
3. Add a TypeScript type in `src/types/index.ts`
4. Add an `addMyNode` action in `src/store/useStore.ts`
5. Add a button in `src/components/Toolbar.tsx`
6. Add persistence handling in `server/index.ts` (`nodeToMd` and `parseMdNode`)

## Debugging

### CLI subprocess issues

Test the CLI directly to isolate issues:

```bash
# Claude
claude -p --output-format stream-json --verbose "Hello"

# Codex
codex exec --json --sandbox read-only "Hello"
```

### Common issues

- **Chat returns empty response** — check that `--verbose` flag is included (required for stream-json with `-p`)
- **Process hangs** — ensure stdio is `['ignore', 'pipe', 'pipe']`, not `['inherit', ...]`
- **Process killed immediately** — ensure cleanup uses `res.on('close')`, not `req.on('close')`

## Type checking

```bash
npx tsc --noEmit
```

## Building for production

```bash
npm run build
```

This creates a `dist/` directory with the built frontend. The Express server would need to be run separately to serve the API.
