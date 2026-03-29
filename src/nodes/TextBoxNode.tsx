import { memo, useCallback, useRef } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TextBoxData, ImageAttachment } from '../types';
import { useStore } from '../store/useStore';
import { uploadImage } from '../lib/api';
import { getImagesFromClipboard } from '../lib/imageUtils';

function TextBoxNodeComponent({ id, data }: NodeProps) {
  const nodeData = data as unknown as TextBoxData;
  const updateNodeData = useStore((s) => s.updateNodeData);
  const deleteNode = useStore((s) => s.deleteNode);
  const forkNode = useStore((s) => s.forkNode);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { content: e.target.value });
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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('image/')
      );
      for (const file of files) {
        handleImageUpload(file);
      }
    },
    [handleImageUpload]
  );

  const removeImage = useCallback(
    (imgId: string) => {
      updateNodeData(id, {
        images: (nodeData.images || []).filter((i) => i.id !== imgId),
      });
    },
    [id, nodeData.images, updateNodeData]
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
    <div
      className="node-container text-node"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onPaste={handlePaste}
    >
      <Handle type="target" position={Position.Top} />

      <button
        className="node-close nodrag"
        onClick={() => deleteNode(id)}
        title="Delete"
      >
        ×
      </button>

      <textarea
        className="node-content nodrag"
        value={nodeData.content || ''}
        onChange={handleContentChange}
        placeholder="Type your thoughts..."
        rows={4}
      />

      {nodeData.images && nodeData.images.length > 0 && (
        <div className="node-images">
          {nodeData.images.map((img) => (
            <div key={img.id} className="node-image-thumb">
              <img src={`/api/image/${img.path}`} alt={img.filename} />
              <button className="img-remove" onClick={() => removeImage(img.id)}>×</button>
            </div>
          ))}
        </div>
      )}

      <div className="node-footer">
        <button
          className="upload-btn nodrag"
          onClick={() => fileInputRef.current?.click()}
        >
          + Image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
            e.target.value = '';
          }}
        />
      </div>

      <div onClickCapture={handleSourceHandleClick}>
        <Handle type="source" position={Position.Bottom} />
      </div>
    </div>
  );
}

export const TextBoxNode = memo(TextBoxNodeComponent);
