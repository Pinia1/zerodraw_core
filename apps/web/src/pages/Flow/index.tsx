import Dot from '@/componenets/Dot';
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
import { useMediaQuery, useMemoizedFn } from '@zeroDraw/common';
import { ConfigProvider, theme } from 'antd';
import { useMemo } from 'react';
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
  cursor: default;

  .react-flow {
    cursor: inherit;
  }
  .react-flow__renderer {
    cursor: inherit;
  }
  .react-flow__pane {
    cursor: inherit !important;
  }
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
    <FlowContainer className="Flow-Container">
      <Toolbar setNodes={setNodes} onFitView={() => fitView({ padding: 0.2 })} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        selectionOnDrag
        panOnDrag={false}
        panActivationKeyCode="Space"
        zoomOnScroll
        zoomActivationKeyCode={null}
        selectionKeyCode={null}
        multiSelectionKeyCode="Shift"
        fitView
        fitViewOptions={{ padding: 0.2 }}
        defaultEdgeOptions={{
          style: { stroke: '#b1b1b7', strokeWidth: 0.8 },
          type: 'smoothstep',
        }}
        deleteKeyCode={['Delete', 'Backspace']}
        maxZoom={20}
        minZoom={0.1}
        colorMode="dark"
      >
        <MiniMap
          position="bottom-right"
          nodeStrokeWidth={3}
          zoomable
          pannable
          style={{ width: 160, height: 100 }}
        />
        <Background variant={BackgroundVariant.Dots} gap={100} size={0.5} color="#e8e8e8" />
      </ReactFlow>
    </FlowContainer>
  );
}

const Flow = () => {
  const [windowTheme] = useMediaQuery();
  const algorithm = useMemo(() => {
    return windowTheme === 'dark' ? theme.darkAlgorithm : theme.compactAlgorithm;
  }, [windowTheme]);

  return (
    <ConfigProvider
      theme={{
        algorithm: [algorithm, theme.compactAlgorithm],
      }}
    >
      <ReactFlowProvider>
        <FlowEditor />
      </ReactFlowProvider>
      <Dot />
    </ConfigProvider>
  );
};

export default Flow;
