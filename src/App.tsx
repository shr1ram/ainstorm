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

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only delete if not focused on an input/textarea
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        const selectedNodes = nodes.filter((n) => n.selected);
        for (const node of selectedNodes) {
          deleteNode(node.id);
        }
      }
    },
    [nodes, deleteNode]
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
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>
    </div>
  );
}
