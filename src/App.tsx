import { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStore } from './store/useStore';
import { nodeTypes } from './nodes/nodeTypes';
import { Toolbar } from './components/Toolbar';
import './App.css';

export default function App() {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const onNodesChange = useStore((s) => s.onNodesChange);
  const onEdgesChange = useStore((s) => s.onEdgesChange);
  const onConnect = useStore((s) => s.onConnect);
  const loadGraph = useStore((s) => s.loadGraph);
  const loaded = useStore((s) => s.loaded);
  const deleteNode = useStore((s) => s.deleteNode);
  const addTextNode = useStore((s) => s.addTextNode);
  const addChatNode = useStore((s) => s.addChatNode);
  const addCodeNode = useStore((s) => s.addCodeNode);
  const addFileNode = useStore((s) => s.addFileNode);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  // Apply theme on mount and when it changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      const isMeta = e.metaKey || e.ctrlKey;

      // Undo/redo works globally (even in inputs)
      if (isMeta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (isMeta && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }

      // Skip other shortcuts when focused on inputs
      if (isInput) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedNodes = nodes.filter((n) => n.selected);
        for (const node of selectedNodes) {
          deleteNode(node.id);
        }
        return;
      }

      // Node creation shortcuts (only when not in an input)
      if (!isMeta && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 't':
            e.preventDefault();
            addTextNode();
            break;
          case 'c':
            e.preventDefault();
            addChatNode();
            break;
          case 'd':
            e.preventDefault();
            addCodeNode();
            break;
          case 'f':
            e.preventDefault();
            addFileNode();
            break;
        }
      }
    },
    [nodes, deleteNode, addTextNode, addChatNode, addCodeNode, addFileNode, undo, redo]
  );

  if (!loaded) {
    return <div className="loading">Loading ainstorm...</div>;
  }

  return (
    <div className="app" onKeyDown={handleKeyDown} tabIndex={0}>
      <Toolbar />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
        }}
        deleteKeyCode={null}
      >
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color={theme === 'dark' ? '#2d2d4e' : undefined}
        />
      </ReactFlow>
    </div>
  );
}
