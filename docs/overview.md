# ainstorm — Overview

## What is ainstorm?

ainstorm is a local brainstorming whiteboard that runs in your browser. It combines freeform note-taking with AI-powered conversation on an infinite canvas.

The core idea: you lay out your thoughts as text boxes, attach files and PDFs, connect them with directed arrows, and attach AI chat or code nodes that automatically see all the upstream context. When you want to explore a different direction, you fork a node and branch off — the fork inherits everything above it but diverges independently.

## Why does it exist?

Most AI chat interfaces are linear — one conversation, one thread. ainstorm makes brainstorming **visual and nonlinear**:

- You can see all your ideas at once, spatially arranged
- You can run multiple AI conversations in parallel, each with different context
- You control exactly what context flows where via directed edges
- You can fork any node to explore "what if" branches without losing your original thread
- Everything persists as human-readable markdown files on disk

## Node types

| Node | Purpose | Color |
|------|---------|-------|
| **Text Box** | Free-form notes and ideas | Purple border |
| **Chat Box** | AI brainstorming assistant with web search | Blue border |
| **Code Box** | Full coding agent with all tools (bash, file editing, etc.) | Purple/violet border |
| **File Box** | Store images and PDFs — PDF text is extracted and flows as context | Green border |

## Design principles

1. **No API costs** — AI nodes spawn `claude` or `codex` CLI subprocesses, using your existing Max/Codex subscriptions. No API keys, no per-token billing.

2. **Local-first** — Everything runs on your machine. The frontend is a Vite dev server, the backend is a tiny Express server that spawns CLI processes and reads/writes files. Nothing leaves your machine except the CLI's own API calls.

3. **Human-readable persistence** — Each node saves as a markdown file with YAML frontmatter. You can read, edit, or grep them outside the app. The graph structure (positions, edges) lives in a single `graph.json`.

4. **Minimal UI** — Nodes are clean boxes with no chrome. Text nodes are just a textarea. Chat nodes are a message list and an input field. Resize from corners, delete with a transparent X, fork with shift-click on the connection handle.

5. **Context as a graph** — The directed edges between nodes define a DAG (directed acyclic graph). When a chat or code node sends a message, it walks the graph backward to collect all ancestor content — including text, conversations, and extracted PDF text.
