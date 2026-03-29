import type { Node, Edge } from '@xyflow/react';

export interface ImageAttachment {
  id: string;
  filename: string;
  path: string; // relative path in data/images/
}

export interface TextBoxData {
  label: string;
  content: string;
  images: ImageAttachment[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: ImageAttachment[];
  timestamp: number;
}

export type AIProvider = 'claude' | 'codex';

export interface ChatBotData {
  label: string;
  provider: AIProvider;
  model: string;
  messages: ChatMessage[];
  isStreaming: boolean;
  images: ImageAttachment[];
  sessionId?: string; // for claude --resume
}

export type TextBoxNode = Node<TextBoxData, 'textBox'>;
export type ChatBotNode = Node<ChatBotData, 'chatBot'>;
export type AppNode = TextBoxNode | ChatBotNode;
export type AppEdge = Edge;

export interface GraphData {
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    label: string;
    width?: number;
    height?: number;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
  }>;
}

export interface SavePayload {
  graph: GraphData;
  nodes: Array<{
    id: string;
    type: string;
    data: TextBoxData | ChatBotData;
  }>;
}
