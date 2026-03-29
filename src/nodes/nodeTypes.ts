import { TextBoxNode } from './TextBoxNode';
import { ChatBotNode } from './ChatBotNode';

export const nodeTypes = {
  textBox: TextBoxNode,
  chatBot: ChatBotNode,
} as const;
