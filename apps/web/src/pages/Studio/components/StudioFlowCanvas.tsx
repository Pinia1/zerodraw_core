import StudioToolBar from './StudioToolBar';
import { studioNodeTypes } from '../nodes';
import { dispatchStudioFlowMutation } from '../flowBridge/dispatchMutation';
import type { StudioFlowMutation } from '../flowBridge/types';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { FlowMutationResult } from '@zeroDraw/api-contract';
import { useMemoizedFn } from '@zeroDraw/common';
import { useEffect } from 'react';
import styled from 'styled-components';
import { initialEdges, initialNodes } from '../constants';
import type { StudioFlowState } from '../types';

const FlowContainer = styled.div`
  width: 100%;
  height: 100%;
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

interface StudioFlowEditorProps {
  onRegisterGetFlowState: (getter: () => StudioFlowState) => void;
  onRegisterApplyFlowMutation: (handler: (mutation: StudioFlowMutation) => FlowMutationResult) => void;
}

function StudioFlowEditor({
  onRegisterGetFlowState,
  onRegisterApplyFlowMutation,
}: StudioFlowEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<StudioNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { fitView, getViewport } = useReactFlow();

  const getFlowState = useMemoizedFn((): StudioFlowState => ({
    nodes,
    edges,
    viewport: getViewport(),
  }));

  useEffect(() => {
    onRegisterGetFlowState(getFlowState);
  }, [getFlowState, onRegisterGetFlowState]);

  const applyFlowMutation = useMemoizedFn((mutation: StudioFlowMutation): FlowMutationResult => {
    const current = getFlowState();
    const { state, result } = dispatchStudioFlowMutation(current, mutation);
    if (result.ok) {
      setNodes(state.nodes);
      setEdges(state.edges);
    }
    return result;
  });

  useEffect(() => {
    onRegisterApplyFlowMutation(applyFlowMutation);
  }, [applyFlowMutation, onRegisterApplyFlowMutation]);

  const onConnect = useMemoizedFn((connection: Connection) => {
    setEdges((current) => addEdge({ ...connection, animated: false }, current));
  });

  const showMiniMap = nodes.length <= 80;

  return (
    <FlowContainer className="Flow-Container">
      <StudioToolBar setNodes={setNodes} onFitView={() => void fitView({ padding: 0.2 })} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={studioNodeTypes}
        onlyRenderVisibleElements
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
        minZoom={0.01}
        colorMode="dark"
      >
        {showMiniMap ? (
          <MiniMap
            position="bottom-right"
            nodeStrokeWidth={3}
            zoomable
            pannable
            style={{ width: 160, height: 100 }}
          />
        ) : null}
        <Background variant={BackgroundVariant.Dots} gap={100} size={0.5} color="#e8e8e8" />
      </ReactFlow>
    </FlowContainer>
  );
}

interface StudioFlowCanvasProps {
  onRegisterGetFlowState: (getter: () => StudioFlowState) => void;
  onRegisterApplyFlowMutation: (
    handler: (mutation: StudioFlowMutation) => FlowMutationResult,
  ) => void;
}

export function StudioFlowCanvas({
  onRegisterGetFlowState,
  onRegisterApplyFlowMutation,
}: StudioFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <StudioFlowEditor
        onRegisterGetFlowState={onRegisterGetFlowState}
        onRegisterApplyFlowMutation={onRegisterApplyFlowMutation}
      />
    </ReactFlowProvider>
  );
}
