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
| `server/index.ts` | Express backend — CLI spawning, file I/O, image/file uploads, PDF extraction |
| `src/store/useStore.ts` | Zustand store — all state and actions, system prompts, modes |
| `src/nodes/TextBoxNode.tsx` | Text node component |
| `src/nodes/ChatBotNode.tsx` | Chat node component (web search enabled) |
| `src/nodes/CodeBoxNode.tsx` | Code agent node component (all tools) |
| `src/nodes/FileBoxNode.tsx` | File box component (images + PDFs) |
| `src/nodes/nodeTypes.ts` | Node type registry |
| `src/lib/contextPropagation.ts` | Graph traversal algorithm |
| `src/components/Toolbar.tsx` | Toolbar with node buttons, provider selector, font size |
| `src/types/index.ts` | TypeScript types for all node/data types |
| `src/App.tsx` | React Flow canvas setup |
| `src/App.css` | All styles (single file) |

## API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/graph` | Load graph + node content from disk |
| POST | `/api/save` | Save graph + node content to disk |
| POST | `/api/chat` | Spawn CLI subprocess, stream response as SSE. Accepts `mode` param (`chat` or `code`) |
| POST | `/api/upload-image` | Upload image file to `data/images/` |
| POST | `/api/upload-file` | Upload file to `data/files/`, extract PDF text via pdf-parse |
| GET | `/api/image/:filename` | Serve an uploaded image |
| GET | `/api/file/:filename` | Serve an uploaded file |

## Node types

| Type | Component | Data type | Mode | Tools |
|------|-----------|-----------|------|-------|
| `textBox` | TextBoxNode | TextBoxData | — | — |
| `chatBot` | ChatBotNode | ChatBotData | `chat` | WebSearch, WebFetch |
| `codeBox` | CodeBoxNode | ChatBotData | `code` | All (default) |
| `fileBox` | FileBoxNode | FileBoxData | — | — |

Chat and code nodes share the `ChatBotData` type but differ in `mode` which controls tool access.

## Adding a new node type

1. Create `src/nodes/MyNode.tsx` — use `TextBoxNode.tsx` or `ChatBotNode.tsx` as a template
2. Add it to `src/nodes/nodeTypes.ts`
3. Add a TypeScript data type in `src/types/index.ts` (must include `[key: string]: unknown` index signature for React Flow compatibility)
4. Add an `addMyNode` action in `src/store/useStore.ts`
5. Update `forkNode` in the store to handle the new type
6. Add a button in `src/components/Toolbar.tsx`
7. Add persistence handling in `server/index.ts` (`nodeToMd` and `parseMdNode`)
8. Update `src/lib/contextPropagation.ts` if the node should contribute to upstream context
9. Add CSS styles in `src/App.css`

## Debugging

### CLI subprocess issues

Test the CLI directly to isolate issues:

```bash
# Claude (chat mode — web search only)
claude -p --output-format stream-json --verbose --tools WebSearch,WebFetch "Hello"

# Claude (code mode — all tools)
claude -p --output-format stream-json --verbose --tools default "Hello"

# Codex
codex exec --json --sandbox read-only "Hello"
```

### Common issues

- **"Loading ainstorm..." forever** — the Express server isn't running or crashed on startup. Check for import errors (e.g. ESM compatibility issues with packages like pdf-parse)
- **Chat returns empty response** — check that `--verbose` flag is included (required for stream-json with `-p`)
- **Process hangs** — ensure stdio is `['ignore', 'pipe', 'pipe']`, not `['inherit', ...]`
- **Process killed immediately** — ensure cleanup uses `res.on('close')`, not `req.on('close')`
- **Chat box loads at full size** — ensure `style` is saved in graph.json (server must persist `n.style`)
- **Node auto-resizes on content change** — the `onNodesChange` filter must block non-resizing dimension changes

## Type checking

```bash
# Quick check (root tsconfig)
npx tsc --noEmit

# Strict check (what VSCode uses)
npx tsc --noEmit --project tsconfig.app.json
```

## Building for production

```bash
npm run build
```

This creates a `dist/` directory with the built frontend. The Express server would need to be run separately to serve the API.
