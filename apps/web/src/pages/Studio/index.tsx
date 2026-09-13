import Dot from '@/componenets/Dot';

import AgentChatPanel from '@/features/agent/AgentChatPanel';

import { createStudioAgentTools, studioClientToolDefinitions } from '@/features/agent/tools/studio';

import { useMediaQuery, useMemoizedFn, useRequest } from '@zeroDraw/common';

import { AgentFrontendToolsProvider } from '@zeroDraw/agent-ui';

import type { FlowMutationResult } from '@zeroDraw/api-contract';

import { ConfigProvider, theme } from 'antd';

import { useMemo, useRef, type CSSProperties } from 'react';

import { useNavigate, useSearchParams } from 'react-router-dom';

import { httpGetProject } from '../../services/project';

import { StudioFlowCanvas } from './components/StudioFlowCanvas';

import { StudioLayout } from './components/StudioLayout';

import { initialEdges, initialNodes } from './constants';

import type { StudioFlowMutation } from './flowBridge/types';

import './studio.css';

import type { StudioFlowState } from './types';

const STUDIO_SESSION_SCOPE = 'studio';

const StudioPage = () => {
  const [searchParams] = useSearchParams();

  const projectId = searchParams.get('projectId');

  const navigate = useNavigate();

  const [windowTheme] = useMediaQuery();

  const getFlowStateRef = useRef<() => StudioFlowState>(() => ({
    nodes: initialNodes,

    edges: initialEdges,

    viewport: { x: 0, y: 0, zoom: 1 },
  }));

  const applyFlowMutationRef = useRef<(mutation: StudioFlowMutation) => FlowMutationResult>(() => ({
    ok: false,

    message: '画布尚未就绪',
  }));

  const registerGetFlowState = useMemoizedFn((getter: () => StudioFlowState) => {
    getFlowStateRef.current = getter;
  });

  const registerApplyFlowMutation = useMemoizedFn(
    (handler: (mutation: StudioFlowMutation) => FlowMutationResult) => {
      applyFlowMutationRef.current = handler;
    }
  );

  const { data: project } = useRequest(() => httpGetProject(projectId!), {
    ready: !!projectId,

    refreshDeps: [projectId],

    onError: () => navigate('/', { replace: true }),
  });

  const algorithm = useMemo(
    () => (windowTheme === 'dark' ? theme.darkAlgorithm : theme.compactAlgorithm),

    [windowTheme]
  );

  const frontendTools = useMemo(
    () =>
      createStudioAgentTools(() => ({
        projectId: projectId ?? '',

        getFlowState: () => getFlowStateRef.current(),

        applyFlowMutation: (mutation) =>
          applyFlowMutationRef.current(mutation as StudioFlowMutation),
      })),

    [projectId]
  );

  const ready = !projectId || project?.id === projectId;

  return (
    <ConfigProvider theme={{ algorithm: [algorithm, theme.compactAlgorithm] }}>
      <div
        style={
          {
            '--studio-bg': windowTheme === 'dark' ? '#0a0a0a' : '#fff',

            '--studio-fg': windowTheme === 'dark' ? '#fafafa' : '#171717',
          } as CSSProperties
        }
      >
        {ready && (
          <AgentFrontendToolsProvider value={frontendTools}>
            <StudioLayout
              title={project?.name ?? 'Studio'}
              chat={
                <AgentChatPanel
                  projectId={projectId ?? ''}
                  clientTools={studioClientToolDefinitions}
                  sessionScope={STUDIO_SESSION_SCOPE}
                />
              }
              flow={
                <StudioFlowCanvas
                  key={projectId ?? 'draft'}
                  projectId={projectId ?? undefined}
                  initialFlowState={project?.flowState ?? null}
                  onRegisterGetFlowState={registerGetFlowState}
                  onRegisterApplyFlowMutation={registerApplyFlowMutation}
                />
              }
            />
          </AgentFrontendToolsProvider>
        )}

        <Dot />
      </div>
    </ConfigProvider>
  );
};

export default StudioPage;
