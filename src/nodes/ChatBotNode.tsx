import { memo, useCallback, useState, useEffect, useRef } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ChatBotData, AIProvider, ImageAttachment } from '../types';
import { useStore } from '../store/useStore';
import { uploadImage } from '../lib/api';
import { getImagesFromClipboard } from '../lib/imageUtils';

function ChatBotNodeComponent({ id, data }: NodeProps) {
  const nodeData = data as unknown as ChatBotData;
  const updateNodeData = useStore((s) => s.updateNodeData);
  const sendMessage = useStore((s) => s.sendMessage);
  const deleteNode = useStore((s) => s.deleteNode);
  const forkNode = useStore((s) => s.forkNode);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [nodeData.messages]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || nodeData.isStreaming) return;
    setInput('');
    sendMessage(id, text);
  }, [id, input, nodeData.isStreaming, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleProviderChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const provider = e.target.value as AIProvider;
      updateNodeData(id, {
        provider,
        label: provider === 'claude' ? 'Claude' : 'Codex',
        model: provider === 'claude' ? 'claude-sonnet-4-6' : 'o3',
      });
    },
    [id, updateNodeData]
  );

  const handleModelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData(id, { model: e.target.value });
    },
    [id, updateNodeData]
  );

  const handleImageUpload = useCallback(
    async (file: File) => {
      try {
        const result = await uploadImage(id, file);
        const img: ImageAttachment = {
          id: `img-${Date.now()}`,
          filename: result.filename,
          path: result.path,
        };
        updateNodeData(id, { images: [...(nodeData.images || []), img] });
      } catch (err) {
        console.error('Image upload failed:', err);
      }
    },
    [id, nodeData.images, updateNodeData]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const files = getImagesFromClipboard(e);
      if (files.length > 0) {
        e.preventDefault();
        for (const file of files) {
          handleImageUpload(file);
        }
      }
    },
    [handleImageUpload]
  );

  const handleSourceHandleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.shiftKey) {
        e.stopPropagation();
        e.preventDefault();
        forkNode(id);
      }
    },
    [id, forkNode]
  );

  const claudeModels = ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5-20251001'];
  const codexModels = ['o3', 'gpt-4o', 'o4-mini', 'codex-mini'];
  const models = nodeData.provider === 'claude' ? claudeModels : codexModels;

  return (
    <div className="node-container chat-node">
      <Handle type="target" position={Position.Top} />

      <button
        className="node-close nodrag"
        onClick={() => deleteNode(id)}
        title="Delete"
      >
        ×
      </button>

      <div className="chat-controls nodrag">
        <select
          className="provider-select"
          value={nodeData.provider}
          onChange={handleProviderChange}
        >
          <option value="claude">Claude</option>
          <option value="codex">Codex</option>
        </select>
        <select
          className="model-select"
          value={nodeData.model}
          onChange={handleModelChange}
        >
          {models.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div className="chat-messages nodrag nopan">
        {nodeData.messages.length === 0 && (
          <div className="chat-empty">Send a message to start brainstorming...</div>
        )}
        {nodeData.messages.map((msg) => (
          <div key={msg.id} className={`chat-message chat-${msg.role}`}>
            <div className="chat-content">{msg.content}</div>
            {msg.images && msg.images.length > 0 && (
              <div className="chat-images">
                {msg.images.map((img) => (
                  <img key={img.id} src={`/api/image/${img.path}`} alt={img.filename} className="chat-img" />
                ))}
              </div>
            )}
          </div>
        ))}
        {nodeData.isStreaming && (
          <div className="chat-streaming">Thinking...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {nodeData.images && nodeData.images.length > 0 && (
        <div className="node-images">
          {nodeData.images.map((img) => (
            <div key={img.id} className="node-image-thumb">
              <img src={`/api/image/${img.path}`} alt={img.filename} />
            </div>
          ))}
        </div>
      )}

      <div className="chat-input-bar nodrag">
        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Type a message..."
          rows={2}
          disabled={nodeData.isStreaming}
        />
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={nodeData.isStreaming || !input.trim()}
        >
          {nodeData.isStreaming ? '...' : '->'}
        </button>
      </div>

      <div onClickCapture={handleSourceHandleClick}>
        <Handle type="source" position={Position.Bottom} />
      </div>
    </div>
  );
}

export const ChatBotNode = memo(ChatBotNodeComponent);
