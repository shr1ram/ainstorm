# ainstorm

A local brainstorming whiteboard that runs in your browser. Create text boxes, AI chat nodes, coding agents, and file attachments on an infinite canvas. Connect them with directed arrows to control context flow, and branch off to explore parallel ideas.

AI nodes spawn **Claude Code** or **Codex** CLI subprocesses, so they use your existing Max/Codex subscriptions with no additional API costs.

## Features

- **Infinite canvas** — pan, zoom, drag nodes freely (powered by React Flow)
- **Text boxes** — editable notes you can connect together
- **Chat nodes** — AI brainstorming assistant that can search the web
- **Code nodes** — full coding agent with access to all tools (bash, file editing, etc.)
- **File nodes** — store images and PDFs; PDF text is automatically extracted and flows as context
- **Directed context flow** — arrows between nodes control what context flows where. Upstream content automatically passes to downstream AI nodes
- **Branching / forking** — shift-click the bottom handle of any node to fork it. The fork inherits all upstream context and diverges independently
- **Image support** — paste images from clipboard into any node
- **Markdown rendering** — AI responses render with proper formatting (bold, headings, lists, code blocks)
- **Markdown persistence** — each node saves as a `.md` file, graph structure in `graph.json`. Human-readable and editable outside the app
- **Font size control** — adjustable font size for text and chat nodes
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

1. Click **+ Text Box**, **+ Chat Box**, **+ Code Box**, or **+ File Box** in the toolbar
2. Type in text boxes to capture ideas
3. Upload PDFs and images to file boxes for reference material
4. **Connect nodes** by dragging from the bottom handle to the top handle of another node
5. In a chat node, type a message and press **Enter** — the AI sees all upstream context and can search the web
6. Use a code node for tasks that need file access, bash commands, or code editing
7. **Shift-click** the bottom handle of any node to fork it
8. Choose the default AI provider (Claude/Codex) and font size from the toolbar

## Documentation

See the [docs/](docs/) folder for detailed documentation:

- [Overview](docs/overview.md) — what ainstorm is, why it exists, node types, design principles
- [User Guide](docs/user-guide.md) — how to use the app, all node types, keyboard shortcuts, tips
- [Architecture](docs/architecture.md) — system diagram, project structure, tech stack, design decisions
- [Context Propagation](docs/context-propagation.md) — how upstream context flows, system prompts, cycle detection
- [CLI Integration](docs/cli-integration.md) — CLI flags, chat vs code mode, stream parsing, debugging
- [Persistence](docs/persistence.md) — markdown file format, save/load flow, file storage
- [Development](docs/development.md) — setup, API endpoints, node types, adding new types, debugging

## License

MIT
