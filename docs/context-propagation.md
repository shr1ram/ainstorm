# Context Propagation

Context propagation is the core feature of ainstorm. It determines what information an AI chat or code node sees when you send it a message.

## How it works

When you send a message in a chat or code node, ainstorm:

1. **Traverses edges backward** (BFS) from the node to find all upstream ancestors
2. **Topologically sorts** the ancestors so earlier nodes come first
3. **Extracts content** from each ancestor:
   - **Text nodes**: their text content
   - **Chat/Code nodes**: their full conversation history (user + assistant messages)
   - **File nodes**: extracted PDF text and image references
4. **Assembles a system prompt** with the upstream context prepended to the default prompt
5. **Appends the node's own conversation history** + the new user message
6. **Sends everything** to the CLI subprocess

### Example

```
[File: research.pdf]  [Text: "Build a habit tracker"]
         │                       │
         └───────┬───────────────┘
                 ▼
        [Text: "Focus on daily streaks"]
                 │
                 ▼
           [Claude Chat] ← you type "What features should it have?"
```

The chat node's system prompt will include:

```
You are a brainstorming assistant...
You can search the internet and fetch websites to find information.

## Upstream Context

### File: research.pdf
[full extracted text from the PDF]

---

### Text
Build a habit tracker

---

### Text
Focus on daily streaks
```

Followed by the conversation history and your new message.

## System prompts

There are two system prompts depending on node type:

**Chat Box** (`mode: 'chat'`):
```
You are a brainstorming assistant in a visual thinking tool called ainstorm.
You are NOT a coding agent — do not attempt to read files, run commands, or
use tools other than web search and web fetch.
Focus on creative thinking, analysis, ideation, and structured reasoning.
You can search the internet and fetch websites to find information.
Respond conversationally and helpfully. Be concise but thorough.
If upstream context is provided, use it to inform your responses.
```

**Code Box** (`mode: 'code'`):
```
You are a coding agent in a visual thinking tool called ainstorm.
You have full access to tools: you can read/write files, run bash commands,
search code, and use all available tools.
If upstream context is provided, use it to inform your work.
Be thorough but concise in your responses.
```

## Cycle detection

Cycles are rejected at connection time. When you try to drag an edge from node A to node B, the `onConnect` handler runs a BFS to check if B can already reach A through existing edges. If so, the connection is silently rejected.

This ensures the graph is always a DAG (directed acyclic graph), which guarantees that context propagation terminates.

## Live context flow

Context is gathered **at send-time**, not cached. This means:

- If you edit an upstream text node after connecting it, the chat/code node sees the updated content on its next message
- If a parent chat node gets new messages, its children see those new messages as context
- If you upload a new PDF to a file node, downstream nodes see the extracted text on their next message
- Forking a node creates a directed edge, so the fork inherits all upstream context and continues to receive updates

## Implementation

The algorithm lives in `src/lib/contextPropagation.ts`:

- `getUpstreamContext(nodeId, nodes, edges)` — returns a formatted string of all ancestor content, handling textBox, chatBot, codeBox, and fileBox node types
- `wouldCreateCycle(nodes, edges, target, source)` — returns true if adding the edge would create a cycle

The topological sort ensures context is presented in flow order (earliest ancestors first), which gives the AI a natural reading order.
