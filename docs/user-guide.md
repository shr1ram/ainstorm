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
- **Zoom** — scroll wheel (except over chat/code message areas, which scroll messages instead)
- **Select** — click a node
- **Delete** — select a node, then press Delete or Backspace (won't fire if you're typing in an input)

## Creating nodes

Use the toolbar in the top-left corner:

- **+ Text Box** — free-form notes (purple border)
- **+ Chat Box** — AI brainstorming assistant with web search (blue border)
- **+ Code Box** — full coding agent with all tools (violet border)
- **+ File Box** — store images and PDFs for context (green border)

## Text nodes

- Click and type to edit
- Paste images from clipboard (Cmd+V / Ctrl+V)
- Transparent X in the top-right corner to delete
- Resize by dragging the corner handles (appear on hover)
- Font size controlled by the toolbar's Font setting

## Chat nodes

- Type a message and press **Enter** to send
- Press **Shift+Enter** for a new line without sending
- Scroll through messages with the mouse wheel / trackpad
- Paste images from clipboard into the input area
- The AI response streams in real-time and renders markdown (bold, headings, lists, code blocks, etc.)
- Can **search the internet** and **fetch websites** for information
- Cannot read files, run commands, or edit code — use a Code Box for that

## Code nodes

- Same chat interface as Chat Box, but with full coding agent capabilities
- Can **run bash commands**, **read/write files**, **search code**, and use all available tools
- "CODE" label in the top-left to distinguish from Chat nodes
- Useful for implementing ideas discussed in upstream chat nodes
- Upstream context (text, files, conversations) flows in automatically

## File nodes

- **Drop or paste** images and PDFs into the node
- Click the drop zone or "+ Add file" button to use the file picker
- Supports multiple files per node
- **PDFs**: text is automatically extracted server-side (up to 50MB) — the extracted text flows as context to downstream chat/code nodes
- **Images**: displayed as thumbnails
- Click the X on any file to remove it

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
- Fork a chat node to ask the AI to explore a different angle
- Fork a code node to try a different implementation approach

## Toolbar controls

| Control | Purpose |
|---------|---------|
| + Text Box | Create a text note |
| + Chat Box | Create a chat node (web search enabled) |
| + Code Box | Create a coding agent node (all tools) |
| + File Box | Create a file storage node (images + PDFs) |
| AI dropdown | Default provider for new chat/code nodes (Claude or Codex) |
| Font input | Font size in pixels for text and chat nodes (8-32px) |

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| Delete / Backspace | Delete selected node(s) |
| Enter | Send message (in chat/code node input) |
| Shift+Enter | New line in chat/code input |
| Shift+Click bottom handle | Fork node |

## Tips

- **Compare AI responses** — fork a chat node, then each fork can take the conversation in a different direction with the same upstream context
- **Build context incrementally** — chain text nodes to build up context step by step before connecting to a chat node
- **Attach research** — use a File Box to upload PDFs, then connect it upstream of a chat node so the AI can reference the document
- **Chat then code** — brainstorm in a Chat Box, then connect it to a Code Box to implement the idea with full tool access
- **Edit upstream, re-ask downstream** — if you change an upstream text node, the next message you send in a downstream chat/code node will see the updated content
- **Read your data** — check `data/nodes/` to see your brainstorming sessions as readable markdown files
