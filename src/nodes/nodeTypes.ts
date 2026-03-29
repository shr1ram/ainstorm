import { TextBoxNode } from './TextBoxNode';
import { ChatBotNode } from './ChatBotNode';
import { CodeBoxNode } from './CodeBoxNode';
import { FileBoxNode } from './FileBoxNode';

export const nodeTypes = {
  textBox: TextBoxNode,
  chatBot: ChatBotNode,
  codeBox: CodeBoxNode,
  fileBox: FileBoxNode,
} as const;
