# CLI Subprocess Integration

ainstorm uses CLI subprocesses to power its AI chat and code nodes. This avoids API costs by leveraging your existing Claude Max and Codex subscriptions.

## How it works

When you send a message in a chat or code node, the Express backend (`server/index.ts`) spawns a CLI process. The `mode` parameter determines tool access:

**Chat mode** (Chat Box — web search only):
```bash
claude -p --output-format stream-json --verbose \
  --tools WebSearch,WebFetch \
  --model claude-sonnet-4-6 \
  --system-prompt "You are a brainstorming assistant..." \
  "The user's prompt with conversation history"
```

**Code mode** (Code Box — all tools):
```bash
claude -p --output-format stream-json --verbose \
  --tools default \
  --model claude-sonnet-4-6 \
  --system-prompt "You are a coding agent..." \
  "The user's prompt with conversation history"
```

**Codex:**
```bash
codex exec --json --sandbox read-only -m o3 \
  "System prompt + user prompt combined"
```

The backend streams the CLI's stdout back to the browser as Server-Sent Events (SSE).

## Claude CLI flags

| Flag | Purpose |
|------|---------|
| `-p` | Non-interactive print mode — exits after response |
| `--output-format stream-json` | Newline-delimited JSON for real-time streaming |
| `--verbose` | Required when using stream-json with `-p` |
| `--model <model>` | Model selection (claude-sonnet-4-6, claude-opus-4-6, etc.) |
| `--system-prompt <text>` | Custom system prompt (for prompts under 10K chars) |
| `--system-prompt-file <path>` | System prompt from file (for prompts over 10K chars, e.g. with PDF context) |
| `--tools <tools>` | Tool access control — `WebSearch,WebFetch` for chat, `default` for code |

## Codex CLI flags

| Flag | Purpose |
|------|---------|
| `exec` | Non-interactive mode |
| `--json` | JSONL output for streaming |
| `-m <model>` | Model selection (o3, gpt-4o, o4-mini, codex-mini) |
| `--sandbox read-only` | Prevents file writes (safety) |

Codex doesn't have a `--system-prompt` flag, so the system prompt is prepended to the user prompt.

## Mode parameter

The `/api/chat` endpoint accepts a `mode` parameter:

- `mode: 'chat'` — enables only `WebSearch` and `WebFetch` tools. Used by Chat Box nodes.
- `mode: 'code'` — enables all tools (`default`). Used by Code Box nodes.

This is set automatically based on the node type — Chat Box nodes always use `'chat'` mode, Code Box nodes always use `'code'` mode.

## Large system prompts

When upstream context is large (>10,000 characters — common when PDFs are in the context graph), the system prompt would exceed CLI argument length limits. In this case:

1. The server writes the system prompt to a temp file (`data/prompt-<timestamp>.txt`)
2. Passes `--system-prompt-file <path>` instead of `--system-prompt`
3. Cleans up the temp file after the process exits

## Stream parsing

The Claude CLI outputs newline-delimited JSON with several event types:

- `type: "system"` — init event with session metadata (ignored)
- `type: "assistant"` — contains the response in `message.content[0].text`
- `type: "result"` — final result with `result` text and `session_id`
- `type: "rate_limit_event"` — rate limit status (ignored)

The frontend (`src/store/useStore.ts` `sendMessage`) parses these events and updates the node's messages in real-time.

## Important: stdio configuration

The subprocess must be spawned with `stdio: ['ignore', 'pipe', 'pipe']`:

- **stdin: `'ignore'`** — prevents the CLI from waiting for input and hanging
- **stdout: `'pipe'`** — captures the JSON stream
- **stderr: `'pipe'`** — captures error output for logging

Using `'inherit'` for stdin causes the process to hang in an Express context.

## Important: response cleanup

The response connection must use `res.on('close')` (not `req.on('close')`) to kill the subprocess when the client disconnects. Using `req.on('close')` kills the process immediately after the POST body is received, before any response is generated.

## Default provider

The toolbar has a default provider selector (Claude or Codex). New chat and code nodes inherit this default. The provider and model are stored in the node's data and passed to the backend with each message.
