# Persistence

ainstorm saves all data to the local filesystem in the `data/` directory. Changes auto-save with a 500ms debounce.

## Directory structure

```
data/
├── graph.json          # Node positions, sizes, styles, edges
├── nodes/
│   ├── node-abc123.md  # One markdown file per node
│   └── node-def456.md
├── images/
│   └── 1717200000-abc.png  # Images pasted into text/chat nodes
└── files/
    ├── 1717200000-xyz.pdf  # PDFs uploaded to file boxes
    └── 1717200000-abc.png  # Images uploaded to file boxes
```

The `data/` directory is gitignored.

## graph.json

Stores the spatial layout, node dimensions, and connections:

```json
{
  "nodes": [
    {
      "id": "node-abc123",
      "type": "textBox",
      "position": { "x": 100, "y": 200 },
      "data": { "label": "My Idea", "content": "...", "images": [] },
      "style": { "width": 300, "height": 150 },
      "measured": { "width": 300, "height": 150 }
    }
  ],
  "edges": [
    { "id": "edge-1", "source": "node-abc123", "target": "node-def456" }
  ]
}
```

The `style` property stores the user-set dimensions (from corner resizing). The `measured` property stores React Flow's measured dimensions. Both are saved to ensure nodes load at their correct size.

## Node markdown files

### Text nodes

```markdown
---
id: node-abc123
type: textBox
label: "My Idea"
created: 2026-03-29T00:00:00Z
---

The actual content of the text box.
```

### Chat nodes

```markdown
---
id: node-def456
type: chatBot
label: "Claude"
provider: claude
model: claude-sonnet-4-6
mode: chat
created: 2026-03-29T00:00:00Z
---

## user
What are the implications of this approach?

## assistant
Based on the upstream context, here are the key implications...
```

### Code nodes

```markdown
---
id: node-ghi789
type: codeBox
label: "Claude Code"
provider: claude
model: claude-sonnet-4-6
mode: code
created: 2026-03-29T00:00:00Z
---

## user
Create a function that parses CSV files

## assistant
Here's a CSV parser implementation...
```

### File nodes

```markdown
---
id: node-jkl012
type: fileBox
label: "Files"
created: 2026-03-29T00:00:00Z
---

- [pdf] research.pdf (1717200000-xyz.pdf)
- [image] diagram.png (1717200000-abc.png)
```

File nodes store a human-readable list of attached files. The actual file data (including extracted PDF text) is stored in `graph.json`'s node data, and the files themselves are in `data/files/`.

## Save flow

1. Any change (node edit, move, connect, delete, resize) triggers `debouncedSave()` in the Zustand store
2. After 500ms of inactivity, it calls `POST /api/save` with the full node and edge state
3. The server writes `graph.json` (including `style` and `measured` dimensions) and one `.md` file per node

## Load flow

1. On app startup, `loadGraph()` calls `GET /api/graph`
2. The server reads `graph.json` and merges each node's `.md` file content into the node data
3. If a node has `measured` dimensions but no `style`, the loader creates `style` from `measured` (backwards compatibility)
4. The frontend hydrates the React Flow canvas with the loaded state

## Images

Images pasted into text or chat nodes are uploaded via `POST /api/upload-image` and saved to `data/images/`. They're referenced by filename in the node data and served via `GET /api/image/:filename`.

## Files (File Box)

Files uploaded to file boxes are uploaded via `POST /api/upload-file` and saved to `data/files/`. For PDFs, text is extracted server-side using `pdf-parse` and stored in the node's data as `extractedText`. This extracted text flows as context to downstream chat/code nodes.

Maximum file size: 50MB.

## Editing outside the app

Since nodes are plain markdown files, you can edit them with any text editor. Changes will be picked up on the next app reload (not live-reloaded).
