# ainstorm

A local brainstorming whiteboard that runs in your browser. Create text boxes and AI chat nodes on an infinite canvas, connect them with directed arrows to control context flow, and branch off to explore parallel ideas.

AI chat nodes spawn **Claude Code** or **Codex** CLI subprocesses, so they use your existing Max/Codex subscriptions with no additional API costs.

## Features

- **Infinite canvas** — pan, zoom, drag nodes freely (powered by React Flow)
- **Text boxes** — editable notes you can connect together
- **AI chat nodes** — conversational interface to Claude or Codex, with model selection
- **Directed context flow** — arrows between nodes control what context flows where. Upstream nodes automatically pass their content to downstream chat nodes
- **Branching / forking** — fork any node to explore parallel ideas. Parent updates flow through to children automatically
- **Image support** — paste or upload images into any node
- **Markdown persistence** — each node saves as a `.md` file in `data/nodes/`, graph structure in `data/graph.json`. Human-readable and editable outside the app
- **No API keys required** — uses `claude` and `codex` CLI tools via your existing subscriptions

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated (`claude` on your PATH)
- Optionally, [Codex CLI](https://github.com/openai/codex) installed and authenticated (`codex` on your PATH)

## Getting started

```bash
git clone https://github.com/shr1ram/ainstorm.git
cd ainstorm
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

This starts two processes concurrently:
- **Vite dev server** on port 5173 (frontend)
- **Express server** on port 3001 (API proxy for CLI subprocesses + file persistence)

## Usage

1. Click **+ Text Box** to create a note, or **+ Chat Box** to create an AI conversation node
2. Type in text boxes to capture ideas
3. **Connect nodes** by dragging from the bottom handle of one node to the top handle of another — this creates a directed edge that controls context flow
4. In a chat node, type a message and press Enter. The AI sees all upstream node content as context
5. **Fork** any node (fork button in the header) to branch off and explore a different direction. The fork inherits all upstream context and continues to receive updates from its parent
6. Switch between **Claude** and **Codex** providers per-node using the dropdown
7. Paste or upload **images** into any node

## How context propagation works

When you send a message in a chat node, ainstorm traverses all upstream edges to gather context:

```
[Text: "Build a productivity app"] → [Text: "Focus on habits"] → [Claude Chat]
```

The chat node sees both upstream text boxes as context in its system prompt. If you fork the chat node, both forks share the same upstream context but diverge independently.

Cycles are automatically rejected — you can only create directed acyclic graphs.

## Persistence

All data is saved locally in the `data/` directory:

```
data/
├── graph.json        # node positions, edges, metadata
├── nodes/
│   ├── node-abc.md   # text box content as markdown
│   └── node-def.md   # chat conversation as markdown
└── images/           # uploaded/pasted images
```

Node files use YAML frontmatter:

```markdown
---
id: node-abc
type: textBox
label: "My Idea"
created: 2026-03-29T00:00:00Z
---

The actual content goes here.
```

Chat nodes store conversations with `## user` / `## assistant` headers. Changes auto-save with 500ms debounce.

## Tech stack

| Component | Technology |
|-----------|-----------|
| Canvas | [React Flow](https://reactflow.dev/) |
| Frontend | React + TypeScript + Vite |
| State | [Zustand](https://github.com/pmndrs/zustand) |
| Backend | Express (minimal API proxy + file I/O) |
| AI | Claude Code CLI / Codex CLI (subprocesses) |
| Persistence | Markdown files + JSON |

## License

MIT
