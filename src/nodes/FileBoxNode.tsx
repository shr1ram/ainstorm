import { memo, useCallback, useRef } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import type { FileBoxData, FileAttachment } from '../types';
import { useStore } from '../store/useStore';
import { NodeContextMenu, useNodeContextMenu } from '../components/NodeContextMenu';

function FileBoxNodeComponent({ id, data }: NodeProps) {
  const nodeData = data as unknown as FileBoxData;
  const updateNodeData = useStore((s) => s.updateNodeData);
  const deleteNode = useStore((s) => s.deleteNode);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { menu, wrapperRef, closeMenu } = useNodeContextMenu(id);

  const handleFileUpload = useCallback(
    async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('nodeId', id);

      try {
        const res = await fetch('/api/upload-file', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) throw new Error('Upload failed');
        const result: FileAttachment = await res.json();
        updateNodeData(id, {
          files: [...(nodeData.files || []), result],
        });
      } catch (err) {
        console.error('File upload failed:', err);
      }
    },
    [id, nodeData.files, updateNodeData]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.type.startsWith('image/') || f.type === 'application/pdf'
      );
      for (const file of files) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/') || item.type === 'application/pdf') {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleFileUpload(file);
          }
        }
      }
    },
    [handleFileUpload]
  );

  const removeFile = useCallback(
    (fileId: string) => {
      updateNodeData(id, {
        files: (nodeData.files || []).filter((f) => f.id !== fileId),
      });
    },
    [id, nodeData.files, updateNodeData]
  );

  return (
    <div
      className="node-wrapper"
      ref={wrapperRef}
    >
      <NodeResizer minWidth={200} minHeight={100} lineClassName="node-resize-line" handleClassName="node-resize-handle" />
      <Handle type="target" position={Position.Top} id="top" />
      <Handle type="target" position={Position.Left} id="left-target" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="source" position={Position.Right} id="right-source" />

      <div
        className="node-container file-node"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onPaste={handlePaste}
        tabIndex={0}
      >
        <button
          className="node-close nodrag"
          onClick={() => deleteNode(id)}
          title="Delete"
        >
          ×
        </button>

        <div className="file-list nodrag nowheel">
          {(!nodeData.files || nodeData.files.length === 0) && (
            <div
              className="file-drop-zone"
              onClick={() => fileInputRef.current?.click()}
            >
              Drop or paste files here
              <span className="file-drop-hint">Images & PDFs</span>
            </div>
          )}
          {nodeData.files && nodeData.files.map((file) => (
            <div key={file.id} className="file-item">
              {file.type === 'image' ? (
                <img src={`/api/file/${file.path}`} alt={file.filename} className="file-thumb" />
              ) : (
                <div className="file-pdf-icon">PDF</div>
              )}
              <div className="file-info">
                <div className="file-name" title={file.filename}>{file.filename}</div>
                {file.type === 'pdf' && file.extractedText && (
                  <div className="file-extracted">
                    {file.extractedText.length.toLocaleString()} chars extracted
                  </div>
                )}
              </div>
              <button className="file-remove nodrag" onClick={() => removeFile(file.id)}>×</button>
            </div>
          ))}
        </div>

        {nodeData.files && nodeData.files.length > 0 && (
          <div className="file-footer">
            <button
              className="file-add-btn nodrag"
              onClick={() => fileInputRef.current?.click()}
            >
              + Add file
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,application/pdf"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            const files = e.target.files;
            if (files) {
              for (let i = 0; i < files.length; i++) {
                handleFileUpload(files[i]);
              }
            }
            e.target.value = '';
          }}
        />
      </div>

      {menu && <NodeContextMenu nodeId={id} menu={menu} onClose={closeMenu} />}
    </div>
  );
}

export const FileBoxNode = memo(FileBoxNodeComponent);
