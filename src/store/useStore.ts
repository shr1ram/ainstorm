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
import type { AIProvider, TextBoxData, ChatBotData, ChatMessage, ImageAttachment } from '../types';
import { getUpstreamContext } from '../lib/contextPropagation';
import { wouldCreateCycle } from '../lib/contextPropagation';

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

interface AppState {
  nodes: Node[];
  edges: Edge[];
  defaultProvider: AIProvider;
  defaultFontSize: number;
  loaded: boolean;

  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  setDefaultProvider: (p: AIProvider) => void;
  setDefaultFontSize: (size: number) => void;
  addTextNode: (position?: { x: number; y: number }) => void;
  addChatNode: (position?: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: Partial<TextBoxData | ChatBotData>) => void;
  deleteNode: (nodeId: string) => void;
  forkNode: (nodeId: string) => void;
  sendMessage: (nodeId: string, content: string, images?: ImageAttachment[]) => Promise<void>;

  loadGraph: () => Promise<void>;
  saveGraph: () => void;
  debouncedSave: () => void;
}

function generateId() {
  return 'node-' + Math.random().toString(36).slice(2, 10);
}

const DEFAULT_SYSTEM_PROMPT = `You are a brainstorming assistant in a visual thinking tool called ainstorm.
You are NOT a coding agent — do not attempt to read files, run commands, or use tools.
Focus on creative thinking, analysis, ideation, and structured reasoning.
Respond conversationally and helpfully. Be concise but thorough.
If upstream context is provided, use it to inform your responses.`;

export const useStore = create<AppState>((set, get) => ({
  nodes: [],
  edges: [],
  defaultProvider: 'claude',
  defaultFontSize: 14,
  loaded: false,

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
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
    set({ edges: addEdge(connection, edges) });
    get().debouncedSave();
  },

  setDefaultProvider: (p) => set({ defaultProvider: p }),
  setDefaultFontSize: (size) => set({ defaultFontSize: size }),

  addTextNode: (position) => {
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
        messages: [],
        isStreaming: false,
        images: [],
      },
      style: { width: 350, height: 400 },
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

  deleteNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    });
    get().debouncedSave();
  },

  forkNode: (nodeId) => {
    const { nodes, edges } = get();
    const source = nodes.find((n) => n.id === nodeId);
    if (!source) return;

    const newId = generateId();
    const newNode: Node = {
      id: newId,
      type: source.type,
      position: {
        x: (source.position?.x || 0) + 300,
        y: (source.position?.y || 0) + 50,
      },
      data: source.type === 'textBox'
        ? { label: 'Text', content: '', images: [] }
        : {
            label: (source.data as ChatBotData).provider === 'claude' ? 'Claude' : 'Codex',
            provider: (source.data as ChatBotData).provider,
            model: (source.data as ChatBotData).model,
            messages: [],
            isStreaming: false,
            images: [],
          },
      style: source.type === 'textBox'
        ? { width: 300, height: 150 }
        : { width: 350, height: 400 },
    };

    const newEdge: Edge = {
      id: `edge-${Date.now()}`,
      source: nodeId,
      target: newId,
    };

    set({
      nodes: [...nodes, newNode],
      edges: [...edges, newEdge],
    });
    get().debouncedSave();
  },

  sendMessage: async (nodeId, content, images) => {
    const { nodes, edges, updateNodeData } = get();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || node.type !== 'chatBot') return;

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

    const systemPrompt = upstreamContext
      ? `${DEFAULT_SYSTEM_PROMPT}\n\n## Upstream Context\n${upstreamContext}`
      : DEFAULT_SYSTEM_PROMPT;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: conversationHistory,
          systemPrompt,
          provider: data.provider,
          model: data.model,
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
        set({ nodes: data.nodes, edges: data.edges || [], loaded: true });
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
