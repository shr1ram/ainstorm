# User Guide

## Getting started

```bash
cd ainstorm
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Canvas basics

- **Pan** — click and drag on empty space
- **Zoom** — scroll wheel (except over chat message areas, which scroll messages instead)
- **Select** — click a node
- **Delete** — select a node, then press Delete or Backspace (won't fire if you're typing in an input)

## Creating nodes

Use the toolbar in the top-left corner:

- **+ Text Box** — creates a text node for free-form notes
- **+ Chat Box** — creates an AI chat node (uses the default provider from the toolbar dropdown)

## Text nodes

- Click and type to edit
- Paste images from clipboard (Cmd+V / Ctrl+V)
- Transparent X in the top-right corner to delete
- Resize by dragging the corner handles (appear on hover)

## Chat nodes

- Type a message and press **Enter** to send
- Press **Shift+Enter** for a new line without sending
- Scroll through messages with the mouse wheel (the canvas won't zoom when your cursor is over the messages)
- Paste images from clipboard into the input area
- The AI response streams in real-time

## Connecting nodes

1. Hover over the bottom handle (circle) of a node
2. Click and drag to the top handle of another node
3. An animated arrow appears, showing the direction of context flow

Context flows in the direction of the arrow. Upstream nodes (where arrows come from) provide context to downstream nodes (where arrows point to).

Cycles are automatically prevented — you can only create directed acyclic graphs.

## Forking nodes

**Shift-click** the bottom handle (circle) of any node to fork it.

Forking creates a new empty node of the same type, connected to the original via a directed edge. The fork inherits all upstream context and can diverge independently.

Use this to explore "what if" branches:
- Fork a text node to try different framings of an idea
- Fork a chat node to ask the AI to explore a different angle while keeping the original conversation intact

## Changing the default AI provider

The toolbar dropdown lets you choose between **Claude** and **Codex** as the default provider. New chat nodes will use whichever is selected.

- **Claude** — uses your Claude Max subscription via the `claude` CLI
- **Codex** — uses your Codex subscription via the `codex` CLI

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| Delete / Backspace | Delete selected node(s) |
| Enter | Send message (in chat node input) |
| Shift+Enter | New line in chat input |
| Shift+Click bottom handle | Fork node |

## Tips

- **Compare AI responses** — fork a chat node, then each fork can take the conversation in a different direction with the same upstream context
- **Build context incrementally** — chain text nodes to build up context step by step before connecting to a chat node
- **Edit upstream, re-ask downstream** — if you change an upstream text node, the next message you send in a downstream chat node will see the updated content
- **Read your data** — check `data/nodes/` to see your brainstorming sessions as readable markdown files
