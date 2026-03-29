import { memo, useCallback, useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import Markdown from 'react-markdown';
import type { ChatBotData, ImageAttachment } from '../types';
import { useStore } from '../store/useStore';
import { uploadImage } from '../lib/api';
import { getImagesFromClipboard } from '../lib/imageUtils';

function CodeBoxNodeComponent({ id, data }: NodeProps) {
  const nodeData = data as unknown as ChatBotData;
  const updateNodeData = useStore((s) => s.updateNodeData);
  const sendMessage = useStore((s) => s.sendMessage);
  const deleteNode = useStore((s) => s.deleteNode);
  const forkNode = useStore((s) => s.forkNode);
  const defaultFontSize = useStore((s) => s.defaultFontSize);
  const [input, setInput] = useState('');
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
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

  return (
    <div className="node-container code-node">
      <NodeResizer minWidth={320} minHeight={250} lineClassName="node-resize-line" handleClassName="node-resize-handle" />
      <Handle type="target" position={Position.Top} />

      <button
        className="node-close nodrag"
        onClick={() => deleteNode(id)}
        title="Delete"
      >
        ×
      </button>

      <div className="code-label">CODE</div>

      <div className="chat-messages nodrag nopan nowheel" ref={messagesRef} style={{ fontSize: `${defaultFontSize}px` }}>
        {nodeData.messages.length === 0 && (
          <div className="chat-empty">Full coding agent — can run code, edit files, use tools...</div>
        )}
        {nodeData.messages.map((msg) => (
          <div key={msg.id} className={`chat-message chat-${msg.role}`}>
            <div className="chat-content"><Markdown>{msg.content}</Markdown></div>
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
          <div className="chat-streaming">Working...</div>
        )}
      </div>

      <div className="chat-input-bar nodrag">
        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Give a coding task... (Enter to send)"
          rows={2}
          disabled={nodeData.isStreaming}
        />
      </div>

      <div onClickCapture={handleSourceHandleClick}>
        <Handle type="source" position={Position.Bottom} />
      </div>
    </div>
  );
}

export const CodeBoxNode = memo(CodeBoxNodeComponent);
