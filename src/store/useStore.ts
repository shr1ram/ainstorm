import { create } from 'zustand';
import {
  type Edge,
  type Node,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';
import type { AIProvider, TextBoxData, ChatBotData, FileBoxData, ChatMessage, ImageAttachment } from '../types';
import { getUpstreamContext } from '../lib/contextPropagation';
import { wouldCreateCycle } from '../lib/contextPropagation';

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

interface HistoryEntry {
  nodes: Node[];
  edges: Edge[];
}

const MAX_HISTORY = 50;

interface AppState {
  nodes: Node[];
  edges: Edge[];
  defaultProvider: AIProvider;
  defaultFontSize: number;
  loaded: boolean;
  theme: 'light' | 'dark';

  // Undo/redo history
  history: HistoryEntry[];
  historyIndex: number;

  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  setDefaultProvider: (p: AIProvider) => void;
  setDefaultFontSize: (size: number) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  addTextNode: (position?: { x: number; y: number }) => void;
  addChatNode: (position?: { x: number; y: number }) => void;
  addCodeNode: (position?: { x: number; y: number }) => void;
  addFileNode: (position?: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: Partial<TextBoxData | ChatBotData | FileBoxData>) => void;
  resizeNode: (nodeId: string, width: number, height: number) => void;
  deleteNode: (nodeId: string) => void;
  forkNode: (nodeId: string, forceType?: 'chatBot' | 'codeBox', direction?: 'top' | 'bottom' | 'left' | 'right') => void;
  sendMessage: (nodeId: string, content: string, images?: ImageAttachment[]) => Promise<void>;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  loadGraph: () => Promise<void>;
  saveGraph: () => void;
  debouncedSave: () => void;
}

function generateId() {
  return 'node-' + Math.random().toString(36).slice(2, 10);
}

const CHAT_SYSTEM_PROMPT = `You are a brainstorming assistant in a visual thinking tool called ainstorm.
You are NOT a coding agent — do not attempt to read files, run commands, or use tools other than web search and web fetch.
Focus on creative thinking, analysis, ideation, and structured reasoning.
You can search the internet and fetch websites to find information.
Respond conversationally and helpfully. Be concise but thorough.
If upstream context is provided, use it to inform your responses.`;

const CODE_SYSTEM_PROMPT = `You are a coding agent in a visual thinking tool called ainstorm.
You have full access to tools: you can read/write files, run bash commands, search code, and use all available tools.
If upstream context is provided, use it to inform your work.
Be thorough but concise in your responses.`;

export const useStore = create<AppState>((set, get) => ({
  nodes: [],
  edges: [],
  defaultProvider: 'claude',
  defaultFontSize: 14,
  loaded: false,
  theme: (typeof window !== 'undefined' && localStorage.getItem('ainstorm-theme') as 'light' | 'dark') || 'light',
  history: [],
  historyIndex: -1,

  onNodesChange: (changes) => {
    // Filter out dimension changes from auto-measurement — nodes should only
    // resize via the NodeResizer, not when content changes.
    // Allow the first measurement (when node has no measured dimensions yet).
    const { nodes } = get();
    const filtered = changes.filter((c) => {
      if (c.type === 'dimensions' && c.resizing !== true) {
        const node = nodes.find((n) => n.id === c.id);
        if (node?.measured) return false; // already measured, block auto-resize
      }
      return true;
    });
    if (filtered.length === 0) return;
    set({ nodes: applyNodeChanges(filtered, get().nodes) });
    get().debouncedSave();
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
    get().debouncedSave();
  },

  onConnect: (connection) => {
    const { nodes, edges } = get();
    const newEdge = { ...connection, id: `edge-${Date.now()}` };
    if (wouldCreateCycle(nodes, [...edges, newEdge as Edge], connection.target!, connection.source!)) {
      return; // reject cycles
    }
    get().pushHistory();
    set({ edges: addEdge(connection, edges) });
    get().debouncedSave();
  },

  setDefaultProvider: (p) => set({ defaultProvider: p }),
  setDefaultFontSize: (size) => set({ defaultFontSize: size }),

  setTheme: (theme) => {
    localStorage.setItem('ainstorm-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },

  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    get().setTheme(newTheme);
  },

  pushHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    const entry: HistoryEntry = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    // Truncate any future entries if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(entry);
    // Keep history bounded
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
      set({ history: newHistory, historyIndex: newHistory.length - 1 });
    } else {
      set({ history: newHistory, historyIndex: newHistory.length - 1 });
    }
  },

  undo: () => {
    const { history, historyIndex, nodes, edges } = get();
    if (historyIndex < 0) return;
    // If at the tip, save current state so redo can restore it
    if (historyIndex === history.length - 1) {
      const current: HistoryEntry = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
      };
      const newHistory = [...history];
      // Replace tip with current (in case changes happened since last push)
      newHistory[historyIndex] = current;
      // Add a "future" entry that redo will use
      if (historyIndex > 0) {
        const prev = history[historyIndex - 1];
        set({
          nodes: prev.nodes,
          edges: prev.edges,
          history: newHistory,
          historyIndex: historyIndex - 1,
        });
        get().debouncedSave();
        return;
      }
    }
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      set({
        nodes: prev.nodes,
        edges: prev.edges,
        historyIndex: historyIndex - 1,
      });
      get().debouncedSave();
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    set({
      nodes: next.nodes,
      edges: next.edges,
      historyIndex: historyIndex + 1,
    });
    get().debouncedSave();
  },

  addTextNode: (position) => {
    get().pushHistory();
    const id = generateId();
    const newNode: Node<TextBoxData> = {
      id,
      type: 'textBox',
      position: position || { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: { label: 'Text', content: '', images: [] },
      style: { width: 300, height: 150 },
    };
    set({ nodes: [...get().nodes, newNode] });
    get().debouncedSave();
  },

  addChatNode: (position) => {
    get().pushHistory();
    const id = generateId();
    const { defaultProvider } = get();
    const newNode: Node<ChatBotData> = {
      id,
      type: 'chatBot',
      position: position || { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {
        label: defaultProvider === 'claude' ? 'Claude' : 'Codex',
        provider: defaultProvider,
        model: defaultProvider === 'claude' ? 'claude-sonnet-4-6' : 'o3',
        mode: 'chat',
        messages: [],
        isStreaming: false,
        images: [],
      },
      style: { width: 350, height: 400 },
    };
    set({ nodes: [...get().nodes, newNode] });
    get().debouncedSave();
  },

  addCodeNode: (position) => {
    get().pushHistory();
    const id = generateId();
    const { defaultProvider } = get();
    const newNode: Node<ChatBotData> = {
      id,
      type: 'codeBox',
      position: position || { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {
        label: defaultProvider === 'claude' ? 'Claude Code' : 'Codex Code',
        provider: defaultProvider,
        model: defaultProvider === 'claude' ? 'claude-sonnet-4-6' : 'o3',
        mode: 'code',
        messages: [],
        isStreaming: false,
        images: [],
      },
      style: { width: 400, height: 450 },
    };
    set({ nodes: [...get().nodes, newNode] });
    get().debouncedSave();
  },

  addFileNode: (position) => {
    get().pushHistory();
    const id = generateId();
    const newNode: Node<FileBoxData> = {
      id,
      type: 'fileBox',
      position: position || { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: { label: 'Files', files: [] },
      style: { width: 250, height: 200 },
    };
    set({ nodes: [...get().nodes, newNode] });
    get().debouncedSave();
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      ),
    });
    get().debouncedSave();
  },

  resizeNode: (nodeId, width, height) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId
          ? { ...n, style: { ...n.style, width, height } }
          : n
      ),
    });
    get().debouncedSave();
  },

  deleteNode: (nodeId) => {
    get().pushHistory();
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    });
    get().debouncedSave();
  },

  forkNode: (nodeId, forceType, direction) => {
    get().pushHistory();
    const { nodes, edges, defaultProvider } = get();
    const source = nodes.find((n) => n.id === nodeId);
    if (!source) return;

    const targetType = forceType || source.type!;
    const newId = generateId();
    const dir = direction || 'bottom';

    let data: Record<string, unknown>;
    let style: { width: number; height: number };

    if (targetType === 'textBox') {
      data = { label: 'Text', content: '', images: [] };
      style = { width: 300, height: 150 };
    } else if (targetType === 'fileBox') {
      data = { label: 'Files', files: [] };
      style = { width: 250, height: 200 };
    } else if (targetType === 'codeBox') {
      data = {
        label: defaultProvider === 'claude' ? 'Claude Code' : 'Codex Code',
        provider: defaultProvider,
        model: defaultProvider === 'claude' ? 'claude-sonnet-4-6' : 'o3',
        mode: 'code',
        messages: [],
        isStreaming: false,
        images: [],
      };
      style = { width: 400, height: 450 };
    } else {
      // chatBot
      data = {
        label: defaultProvider === 'claude' ? 'Claude' : 'Codex',
        provider: defaultProvider,
        model: defaultProvider === 'claude' ? 'claude-sonnet-4-6' : 'o3',
        mode: 'chat',
        messages: [],
        isStreaming: false,
        images: [],
      };
      style = { width: 350, height: 400 };
    }

    // Position the new node based on direction, with a gap
    const sourceW = (source.style?.width as number) || 300;
    const sourceH = (source.style?.height as number) || 300;
    const gap = 80;
    let newX = source.position?.x || 0;
    let newY = source.position?.y || 0;

    if (dir === 'right') {
      newX += sourceW + gap;
    } else if (dir === 'left') {
      newX -= style.width + gap;
    } else if (dir === 'bottom') {
      newY += sourceH + gap;
    } else {
      // top
      newY -= style.height + gap;
    }

    // Map direction to handle IDs — source handle on parent, opposite target handle on child
    const handleMap: Record<string, { sourceHandle: string; targetHandle: string }> = {
      right:  { sourceHandle: 'right-source', targetHandle: 'left-target' },
      left:   { sourceHandle: 'left-target',  targetHandle: 'right-source' },
      bottom: { sourceHandle: 'bottom',       targetHandle: 'top' },
      top:    { sourceHandle: 'top',          targetHandle: 'bottom' },
    };
    const handles = handleMap[dir];

    const newNode: Node = {
      id: newId,
      type: targetType,
      position: { x: newX, y: newY },
      data,
      style,
    };

    const newEdge: Edge = {
      id: `edge-${Date.now()}`,
      source: nodeId,
      sourceHandle: handles.sourceHandle,
      target: newId,
      targetHandle: handles.targetHandle,
    };

    set({
      nodes: [...nodes, newNode],
      edges: [...edges, newEdge],
    });
    get().debouncedSave();
  },

  sendMessage: async (nodeId, content, images) => {
    const { nodes, updateNodeData } = get();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || (node.type !== 'chatBot' && node.type !== 'codeBox')) return;

    const data = node.data as ChatBotData;

    // Add user message
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      images,
      timestamp: Date.now(),
    };
    const updatedMessages = [...data.messages, userMsg];
    updateNodeData(nodeId, { messages: updatedMessages, isStreaming: true });

    // Gather upstream context
    const upstreamContext = getUpstreamContext(nodeId, get().nodes, get().edges);

    // Build the prompt with conversation history
    let conversationHistory = '';
    for (const msg of updatedMessages) {
      conversationHistory += `\n\n## ${msg.role}\n${msg.content}`;
    }

    const basePrompt = data.mode === 'code' ? CODE_SYSTEM_PROMPT : CHAT_SYSTEM_PROMPT;
    const systemPrompt = upstreamContext
      ? `${basePrompt}\n\n## Upstream Context\n${upstreamContext}`
      : basePrompt;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: conversationHistory,
          systemPrompt,
          provider: data.provider,
          model: data.model,
          mode: data.mode || 'chat',
          sessionId: data.sessionId,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantContent = '';
      let sessionId = data.sessionId;

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);

            // Handle claude stream-json format
            if (event.type === 'assistant' && event.message?.content) {
              // Extract text from content blocks
              const textBlocks = event.message.content
                .filter((b: { type: string }) => b.type === 'text')
                .map((b: { text: string }) => b.text);
              if (textBlocks.length > 0) {
                assistantContent = textBlocks.join('');
              }
            } else if (event.type === 'result') {
              if (event.result) assistantContent = event.result;
              if (event.session_id) sessionId = event.session_id;
            } else if (event.type === 'error') {
              assistantContent += `\n\nError: ${event.error || event.message || 'Unknown error'}`;
            }
            // Handle codex jsonl format
            else if (event.type === 'message' && event.content) {
              assistantContent = typeof event.content === 'string'
                ? event.content
                : JSON.stringify(event.content);
            }

            // Update the assistant message in real-time
            const currentNodes = get().nodes;
            const currentNode = currentNodes.find((n) => n.id === nodeId);
            if (currentNode) {
              const currentData = currentNode.data as ChatBotData;
              const msgs = [...currentData.messages.filter((m) => m.id !== assistantMsg.id)];
              assistantMsg.content = assistantContent;
              msgs.push(assistantMsg);
              updateNodeData(nodeId, { messages: msgs });
            }
          } catch {
            // skip unparseable lines
          }
        }
      }

      // Finalize
      updateNodeData(nodeId, { isStreaming: false, sessionId });
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now() + 2}`,
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: Date.now(),
      };
      const currentNode = get().nodes.find((n) => n.id === nodeId);
      if (currentNode) {
        const currentData = currentNode.data as ChatBotData;
        updateNodeData(nodeId, {
          messages: [...currentData.messages, errorMsg],
          isStreaming: false,
        });
      }
    }

    get().debouncedSave();
  },

  loadGraph: async () => {
    try {
      const res = await fetch('/api/graph');
      if (!res.ok) {
        set({ loaded: true });
        return;
      }
      const data = await res.json();
      if (data.nodes && data.nodes.length > 0) {
        // Ensure loaded nodes have style dimensions so they don't auto-expand
        const nodes = data.nodes.map((n: Node) => {
          if (!n.style && n.measured) {
            return { ...n, style: { width: n.measured.width, height: n.measured.height } };
          }
          return n;
        });
        set({ nodes, edges: data.edges || [], loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  saveGraph: async () => {
    const { nodes, edges } = get();
    try {
      await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges }),
      });
    } catch {
      // silent fail for saves
    }
  },

  debouncedSave: () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      get().saveGraph();
    }, 500);
  },
}));

