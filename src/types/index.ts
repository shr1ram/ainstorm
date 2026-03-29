import type { Node, Edge } from '@xyflow/react';

export interface ImageAttachment {
  id: string;
  filename: string;
  path: string;
  [key: string]: unknown;
}

export interface TextBoxData {
  label: string;
  content: string;
  images: ImageAttachment[];
  [key: string]: unknown;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: ImageAttachment[];
  timestamp: number;
  [key: string]: unknown;
}

export type AIProvider = 'claude' | 'codex';

export type NodeMode = 'chat' | 'code';

export interface ChatBotData {
  label: string;
  provider: AIProvider;
  model: string;
  mode: NodeMode;
  messages: ChatMessage[];
  isStreaming: boolean;
  images: ImageAttachment[];
  sessionId?: string;
  [key: string]: unknown;
}

export interface FileAttachment {
  id: string;
  filename: string;
  path: string;
  type: 'pdf' | 'image';
  extractedText?: string;
  size?: number;
  [key: string]: unknown;
}

export interface FileBoxData {
  label: string;
  files: FileAttachment[];
  [key: string]: unknown;
}

export type TextBoxNode = Node<TextBoxData, 'textBox'>;
export type ChatBotNode = Node<ChatBotData, 'chatBot'>;
export type CodeBoxNode = Node<ChatBotData, 'codeBox'>;
export type FileBoxNode = Node<FileBoxData, 'fileBox'>;
export type AppNode = TextBoxNode | ChatBotNode | CodeBoxNode | FileBoxNode;
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
