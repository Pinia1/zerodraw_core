import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMemoizedFn } from '@zeroDraw/common';
import styled from 'styled-components';
import Toolbar from './components/ToolBar';
import { nodeTypes } from './nodes';

// 初始节点
const initialNodes: Node[] = [
  {
    id: 'start-1',
    type: 'img',
    position: { x: 100, y: 100 },
    data: { label: '开始' },
  },
  {
    id: 'task-1',
    type: 'img',
    position: { x: 200, y: 120 },
    data: { label: '数据采集', status: 'done', description: '从 API 获取用户数据' },
  },
];

// 初始连线
const initialEdges: Edge[] = [{ id: 'e-start-task1', source: 'start-1', target: 'task-1' }];

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
      >
        <Controls position="bottom-left" />
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
