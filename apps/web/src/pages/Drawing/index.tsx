import Dot from '@/componenets/Dot';
import { useMediaQuery, useRequest, useSize } from '@zeroDraw/common';
import { Drawing, Tools, useDrawingStore } from '@zeroDraw/core';
import { ConfigProvider, theme } from 'antd';
import { useMemo, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { useShallow } from 'zustand/react/shallow';
import { httpGetProject } from '../../services/project';

const Container = styled.div`
  width: 100%;
  height: 100vh;
  overflow: hidden;
`;

const DrawingPage = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useSize(containerRef);
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const location = useLocation();
  const navigate = useNavigate();
  const initialImageFile = (location.state as any)?.imageFile as File | undefined;
  const [windowTheme] = useMediaQuery();
  const { currentProjectId, setCurrentProjectId, resetLayerConfig } = useDrawingStore(
    useShallow((s) => ({
      currentProjectId: s.currentProjectId,
      setCurrentProjectId: s.setCurrentProjectId,
      resetLayerConfig: s.resetLayerConfig,
    }))
  );

  const { data: project } = useRequest(() => httpGetProject(projectId!), {
    ready: !!projectId,
    refreshDeps: [projectId],
    onSuccess: (data) => {
      if (data.id !== currentProjectId) {
        resetLayerConfig();
        setCurrentProjectId(data.id);
      }
    },
    onError: () => navigate('/drawing', { replace: true }),
  });

  const algorithm = useMemo(
    () => (windowTheme === 'dark' ? theme.darkAlgorithm : theme.compactAlgorithm),
    [windowTheme]
  );

  const ready = size && (!projectId || project?.id === projectId);

  return (
    <ConfigProvider theme={{ algorithm: [algorithm, theme.compactAlgorithm] }}>
      <Container
        style={{ background: windowTheme === 'dark' ? '#000' : '#fff' }}
        ref={containerRef}
      >
        {ready && (
          <Drawing
            key={projectId ?? 'default'}
            size={size!}
            tools={[Tools.TOOL, Tools.LAYERS_CONTROL, Tools.FLEXIBLE]}
            canvasWidth={project?.canvasWidth}
            canvasHeight={project?.canvasHeight}
            initialImageFile={initialImageFile}
          />
        )}
        <Dot />
      </Container>
    </ConfigProvider>
  );
};

export default DrawingPage;
