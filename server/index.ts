import express from 'express';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(process.cwd(), 'data');
const NODES_DIR = path.join(DATA_DIR, 'nodes');
const IMAGES_DIR = path.join(DATA_DIR, 'images');
const GRAPH_FILE = path.join(DATA_DIR, 'graph.json');

// Ensure directories exist
for (const dir of [DATA_DIR, NODES_DIR, IMAGES_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

app.use(express.json({ limit: '50mb' }));

// Image upload
const storage = multer.diskStorage({
  destination: IMAGES_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.post('/api/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file' });
    return;
  }
  res.json({
    filename: req.file.filename,
    path: req.file.filename,
  });
});

// Serve images
app.get('/api/image/:filename', (req, res) => {
  const filepath = path.join(IMAGES_DIR, req.params.filename);
  if (!fs.existsSync(filepath)) {
    res.status(404).send('Not found');
    return;
  }
  res.sendFile(filepath);
});

// Load graph
app.get('/api/graph', (_req, res) => {
  try {
    if (!fs.existsSync(GRAPH_FILE)) {
      res.json({ nodes: [], edges: [] });
      return;
    }
    const graphData = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf-8'));

    // Load node content from .md files
    const nodes = (graphData.nodes || []).map((node: Record<string, unknown>) => {
      const mdPath = path.join(NODES_DIR, `${node.id}.md`);
      if (fs.existsSync(mdPath)) {
        const content = fs.readFileSync(mdPath, 'utf-8');
        const parsed = parseMdNode(content);
        return { ...node, data: { ...node.data as object, ...parsed.data } };
      }
      return node;
    });

    res.json({ nodes, edges: graphData.edges || [] });
  } catch (err) {
    console.error('Error loading graph:', err);
    res.json({ nodes: [], edges: [] });
  }
});

// Save graph
app.post('/api/save', (req, res) => {
  try {
    const { nodes, edges } = req.body;

    // Save graph structure
    const graphData = {
      nodes: nodes.map((n: Record<string, unknown>) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
        measured: n.measured,
      })),
      edges: edges.map((e: Record<string, unknown>) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
    };
    fs.writeFileSync(GRAPH_FILE, JSON.stringify(graphData, null, 2));

    // Save each node as a .md file
    for (const node of nodes) {
      const mdContent = nodeToMd(node);
      fs.writeFileSync(path.join(NODES_DIR, `${node.id}.md`), mdContent);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error saving:', err);
    res.status(500).json({ error: 'Save failed' });
  }
});

// Chat endpoint — spawns CLI subprocess
app.post('/api/chat', (req, res) => {
  const { prompt, systemPrompt, provider, model } = req.body;

  console.log('[chat] provider:', provider, 'model:', model, 'prompt length:', prompt?.length);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let proc;
  let cmd: string;
  let args: string[];

  if (provider === 'codex') {
    cmd = 'codex';
    args = ['exec', '--json', '--sandbox', 'read-only'];
    if (model) args.push('-m', model);
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
    args.push(fullPrompt);
  } else {
    // Default: claude
    cmd = 'claude';
    args = ['-p', '--output-format', 'stream-json', '--verbose'];
    if (model) args.push('--model', model);
    if (systemPrompt) args.push('--system-prompt', systemPrompt);
    args.push(prompt);
  }

  console.log('[chat] spawning:', cmd, args.slice(0, 5).join(' '), '...');

  proc = spawn(cmd, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  let buffer = '';

  proc.stdout.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // keep incomplete line in buffer

    for (const line of lines) {
      if (line.trim()) {
        res.write(`data: ${line}\n\n`);
      }
    }
  });

  proc.stderr.on('data', (chunk: Buffer) => {
    console.error('[CLI stderr]:', chunk.toString());
  });

  proc.on('close', (code) => {
    // Flush remaining buffer
    if (buffer.trim()) {
      res.write(`data: ${buffer}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ type: 'done', code })}\n\n`);
    res.end();
  });

  proc.on('error', (err) => {
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    res.end();
  });

  // Clean up if client disconnects before process finishes
  res.on('close', () => {
    if (!proc.killed) {
      proc.kill();
    }
  });
});

// Convert node to markdown
function nodeToMd(node: Record<string, unknown>): string {
  const data = node.data as Record<string, unknown>;
  const lines: string[] = [];

  lines.push('---');
  lines.push(`id: ${node.id}`);
  lines.push(`type: ${node.type}`);
  lines.push(`label: "${data.label || ''}"`);
  if (data.provider) lines.push(`provider: ${data.provider}`);
  if (data.model) lines.push(`model: ${data.model}`);
  lines.push(`created: ${new Date().toISOString()}`);
  lines.push('---');
  lines.push('');

  if (node.type === 'textBox') {
    lines.push(String(data.content || ''));
  } else if (node.type === 'chatBot') {
    const messages = (data.messages || []) as Array<{ role: string; content: string }>;
    for (const msg of messages) {
      lines.push(`## ${msg.role}`);
      lines.push(msg.content);
      lines.push('');
    }
  }

  return lines.join('\n');
}

// Parse markdown node file
function parseMdNode(content: string): { frontmatter: Record<string, string>; data: Record<string, unknown> } {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return { frontmatter: {}, data: {} };

  const frontmatter: Record<string, string> = {};
  for (const line of fmMatch[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      frontmatter[key] = val;
    }
  }

  const body = fmMatch[2];
  const data: Record<string, unknown> = {
    label: frontmatter.label || '',
  };

  if (frontmatter.type === 'textBox') {
    data.content = body.trim();
    data.images = [];
  } else if (frontmatter.type === 'chatBot') {
    data.provider = frontmatter.provider || 'claude';
    data.model = frontmatter.model || 'claude-sonnet-4-6';
    data.isStreaming = false;
    data.images = [];

    // Parse messages from ## headers
    const messages: Array<{ id: string; role: string; content: string; timestamp: number }> = [];
    const msgParts = body.split(/^## (user|assistant)\n/m);
    // msgParts: ['', 'user', 'content...', 'assistant', 'content...', ...]
    for (let i = 1; i < msgParts.length; i += 2) {
      const role = msgParts[i];
      const msgContent = (msgParts[i + 1] || '').trim();
      if (msgContent) {
        messages.push({
          id: `msg-loaded-${i}`,
          role,
          content: msgContent,
          timestamp: Date.now(),
        });
      }
    }
    data.messages = messages;
  }

  return { frontmatter, data };
}

app.listen(PORT, () => {
  console.log(`ainstorm server running on http://localhost:${PORT}`);
});
