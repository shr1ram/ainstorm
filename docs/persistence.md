# Persistence

ainstorm saves all data to the local filesystem in the `data/` directory. Changes auto-save with a 500ms debounce.

## Directory structure

```
data/
├── graph.json          # Node positions, sizes, edges
├── nodes/
│   ├── node-abc123.md  # One markdown file per node
│   └── node-def456.md
└── images/
    └── 1717200000-abc123.png  # Uploaded/pasted images
```

The `data/` directory is gitignored.

## graph.json

Stores the spatial layout and connections:

```json
{
  "nodes": [
    {
      "id": "node-abc123",
      "type": "textBox",
      "position": { "x": 100, "y": 200 },
      "data": { "label": "My Idea", "content": "...", "images": [] },
      "measured": { "width": 300, "height": 150 }
    }
  ],
  "edges": [
    { "id": "edge-1", "source": "node-abc123", "target": "node-def456" }
  ]
}
```

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
created: 2026-03-29T00:00:00Z
---

## user
What are the implications of this approach?

## assistant
Based on the upstream context, here are the key implications...

## user
Can you elaborate on point 2?

## assistant
Sure, let me expand on that...
```

Conversations are stored with `## user` / `## assistant` headers. This makes them human-readable and greppable.

## Save flow

1. Any change (node edit, move, connect, delete) triggers `debouncedSave()` in the Zustand store
2. After 500ms of inactivity, it calls `POST /api/save` with the full node and edge state
3. The server writes `graph.json` and one `.md` file per node

## Load flow

1. On app startup, `loadGraph()` calls `GET /api/graph`
2. The server reads `graph.json` and merges each node's `.md` file content into the node data
3. The frontend hydrates the React Flow canvas with the loaded state

## Images

Images are uploaded via `POST /api/upload-image` (multipart form data) and saved to `data/images/`. They're referenced by filename in the node data and served via `GET /api/image/:filename`.

Images can be pasted from the clipboard into any node — no file picker needed.

## Editing outside the app

Since nodes are plain markdown files, you can edit them with any text editor. Changes will be picked up on the next app reload (not live-reloaded).

The `graph.json` file can also be edited manually to adjust positions or connections, though this is less practical.
