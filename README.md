# ainstorm

A local brainstorming whiteboard that runs in your browser. Create text boxes and AI chat nodes on an infinite canvas, connect them with directed arrows to control context flow, and branch off to explore parallel ideas.

AI chat nodes spawn **Claude Code** or **Codex** CLI subprocesses, so they use your existing Max/Codex subscriptions with no additional API costs.

## Features

- **Infinite canvas** — pan, zoom, drag nodes freely (powered by React Flow)
- **Text boxes** — editable notes you can connect together
- **AI chat nodes** — conversational interface to Claude or Codex, streaming responses in real-time
- **Directed context flow** — arrows between nodes control what context flows where. Upstream nodes automatically pass their content to downstream chat nodes
- **Branching / forking** — shift-click the bottom handle of any node to fork it. The fork inherits all upstream context and diverges independently
- **Image support** — paste images from clipboard into any node
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

## Quick usage

1. Click **+ Text Box** or **+ Chat Box** in the toolbar
2. Type in text boxes to capture ideas
3. **Connect nodes** by dragging from the bottom handle to the top handle of another node
4. In a chat node, type a message and press **Enter** — the AI sees all upstream context
5. **Shift-click** the bottom handle of any node to fork it
6. Choose the default AI provider (Claude/Codex) from the toolbar dropdown

## Documentation

See the [docs/](docs/) folder for detailed documentation:

- [Overview](docs/overview.md) — what ainstorm is and why it exists
- [User Guide](docs/user-guide.md) — how to use the app, keyboard shortcuts, tips
- [Architecture](docs/architecture.md) — system diagram, project structure, tech stack, design decisions
- [Context Propagation](docs/context-propagation.md) — how upstream context flows to chat nodes
- [CLI Integration](docs/cli-integration.md) — how Claude/Codex CLI subprocesses work
- [Persistence](docs/persistence.md) — markdown file format, save/load flow
- [Development](docs/development.md) — setup, API endpoints, adding node types, debugging

## License

MIT
