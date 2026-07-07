import React, { useRef, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useWorkflowStore } from './store/useWorkflowStore';
import CustomNode from './components/CustomNode';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';

// Register custom node type mapping
const nodeTypes = {
  'manual-trigger': CustomNode,
  'webhook-trigger': CustomNode,
  'schedule-trigger': CustomNode,
  'http-request': CustomNode,
  'delay': CustomNode,
  'condition': CustomNode,
  'loop': CustomNode,
  'transform': CustomNode,
  'llm-prompt': CustomNode,
  'tool-call': CustomNode,
  'log-debug': CustomNode,
};

function WorkflowCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onNodeDragStop, addNode, undo, redo } = useWorkflowStore();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // Drag and drop handlers
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      // Check if dropped element is valid
      if (typeof type === 'undefined' || !type) {
        return;
      }

      // Convert client coordinates to flow space coordinates
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
    },
    [screenToFlowPosition, addNode]
  );

  // Global Keyboard Shortcuts (Undo/Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in input/textarea/select
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT')
      ) {
        return;
      }

      // Undo: Ctrl/Cmd + Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Redo: Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <div
      ref={reactFlowWrapper}
      className="w-full h-full flex-1 relative bg-background"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        className="text-text-primary"
      >
        <Background color="#2A2F3A" gap={16} size={1.2} />
        <Controls className="!bg-surface !border-outline !text-text-primary fill-current [&_button]:!bg-transparent [&_button]:!border-outline [&_button]:!text-text-primary [&_svg]:!fill-text-primary" />
        <MiniMap
          style={{ background: '#171B22', border: '1px solid #2A2F3A', borderRadius: '12px' }}
          nodeColor="#2A2F3A"
          maskColor="rgba(14, 17, 22, 0.7)"
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
      </ReactFlow>
    </div>
  );
}

export default function App() {
  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-background text-text-primary font-sans">
      <ReactFlowProvider>
        <Topbar />
        <div className="flex flex-row flex-1 h-[calc(100vh-4rem)] pt-16">
          <Sidebar />
          {/* Offset by Sidebar width (80 = 20rem) */}
          <div className="flex-1 h-full pl-80">
            <WorkflowCanvas />
          </div>
        </div>
        <Toast />
      </ReactFlowProvider>
    </div>
  );
}
