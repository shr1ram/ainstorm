import { TextBoxNode } from './TextBoxNode';
import { ChatBotNode } from './ChatBotNode';
import { FileBoxNode } from './FileBoxNode';

export const nodeTypes = {
  textBox: TextBoxNode,
  chatBot: ChatBotNode,
  fileBox: FileBoxNode,
} as const;
