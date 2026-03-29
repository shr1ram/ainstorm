# Context Propagation

Context propagation is the core feature of ainstorm. It determines what information an AI chat node sees when you send it a message.

## How it works

When you send a message in a chat node, ainstorm:

1. **Traverses edges backward** (BFS) from the chat node to find all upstream ancestors
2. **Topologically sorts** the ancestors so earlier nodes come first
3. **Extracts content** from each ancestor:
   - Text nodes: their text content
   - Chat nodes: their full conversation history (user + assistant messages)
4. **Assembles a system prompt** with the upstream context prepended to the default brainstorming prompt
5. **Appends the chat node's own conversation history** + the new user message
6. **Sends everything** to the CLI subprocess

### Example

```
[Text: "Build a habit tracker"]
         │
         ▼
[Text: "Focus on daily streaks"]
         │
         ▼
[Claude Chat] ← you type "What features should it have?"
```

The chat node's system prompt will include:

```
You are a brainstorming assistant...

## Upstream Context

### Text
Build a habit tracker

---

### Text
Focus on daily streaks
```

Followed by the conversation history and your new message.

## Cycle detection

Cycles are rejected at connection time. When you try to drag an edge from node A to node B, the `onConnect` handler runs a BFS to check if B can already reach A through existing edges. If so, the connection is silently rejected.

This ensures the graph is always a DAG (directed acyclic graph), which guarantees that context propagation terminates.

## Live context flow

Context is gathered **at send-time**, not cached. This means:

- If you edit an upstream text node after connecting it, the chat node sees the updated content on its next message
- If a parent chat node gets new messages, its children see those new messages as context
- Forking a node creates a directed edge, so the fork inherits all upstream context and continues to receive updates

## Implementation

The algorithm lives in `src/lib/contextPropagation.ts`:

- `getUpstreamContext(nodeId, nodes, edges)` — returns a formatted string of all ancestor content
- `wouldCreateCycle(nodes, edges, target, source)` — returns true if adding the edge would create a cycle

The topological sort ensures context is presented in flow order (earliest ancestors first), which gives the AI a natural reading order.

## Default system prompt

Every CLI subprocess receives this system prompt (defined in `src/store/useStore.ts`):

```
You are a brainstorming assistant in a visual thinking tool called ainstorm.
You are NOT a coding agent — do not attempt to read files, run commands, or use tools.
Focus on creative thinking, analysis, ideation, and structured reasoning.
Respond conversationally and helpfully. Be concise but thorough.
If upstream context is provided, use it to inform your responses.
```

This is important because the `claude` CLI is normally a coding agent. The system prompt overrides that behavior.
