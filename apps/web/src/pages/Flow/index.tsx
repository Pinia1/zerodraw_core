import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMemoizedFn } from '@zeroDraw/common';
import styled from 'styled-components';
import Toolbar from './components/ToolBar';
import { nodeTypes } from './nodes';

// 初始节点
const initialNodes: AppNode[] = [
  {
    id: 'init-image-1',
    type: 'img',
    position: { x: 0, y: 0 },
    data: { src: '/zero.png', width: 250, height: 246, s3Key: '4b06f6136e4642e69feed9fc376d508e' },
  },
  {
    id: 'init-create-with-ai-1',
    type: 'createWithAI',
    position: { x: 300, y: 0 },
    data: {
      prompt: 'A beautiful girl',
      imageId: 'init-image-1',
    },
  },
  {
    id: 'init-lib',
    type: 'lib',
    position: { x: -1000, y: 0 },
    data: {},
  },
];

// 初始连线
const initialEdges: Edge[] = [
  {
    id: 'e-init-image-1-init-create-with-ai-1',
    source: 'init-image-1',
    target: 'init-create-with-ai-1',
  },
];

const FlowContainer = styled.div`
  width: 100%;
  height: 100vh;
  position: relative;
`;

function FlowEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { zoomIn, zoomOut, fitView, getViewport } = useReactFlow();

  const onConnect = useMemoizedFn(() => {
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: false }, eds));
    };
  });

  return (
    <FlowContainer>
      <Toolbar setNodes={setNodes} onFitView={() => fitView({ padding: 0.2 })} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        defaultEdgeOptions={{
          style: { stroke: '#b1b1b7', strokeWidth: 0.8 },
          type: 'smoothstep',
        }}
        deleteKeyCode={['Delete', 'Backspace']}
        multiSelectionKeyCode="Shift"
        maxZoom={20}
        minZoom={0.1}
      >
        <MiniMap
          position="bottom-right"
          nodeStrokeWidth={3}
          zoomable
          pannable
          style={{ width: 160, height: 100 }}
        />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e8e8e8" />
      </ReactFlow>
    </FlowContainer>
  );
}

const Flow = () => {
  return (
    <ReactFlowProvider>
      <FlowEditor />
    </ReactFlowProvider>
  );
};

export default Flow;
