import { useMediaQuery, useRequest, useSize, useUpdateEffect } from '@zeroDraw/common';
import { Drawing, Tools, useDrawingStore } from '@zeroDraw/core';
import { ConfigProvider, theme } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
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
  const initialImageFile = (location.state as any)?.imageFile as File | undefined;
  const [windowTheme] = useMediaQuery();
  const { currentProjectId, setCurrentProjectId, resetLayerConfig } = useDrawingStore(
    useShallow((s) => ({
      currentProjectId: s.currentProjectId,
      setCurrentProjectId: s.setCurrentProjectId,
      resetLayerConfig: s.resetLayerConfig,
    }))
  );

  // 控制 Drawing 是否可以挂载：必须等到可能的 resetLayerConfig 已执行完才允许渲染
  const [readyToRender, setReadyToRender] = useState(false);

  const { data: project } = useRequest(() => httpGetProject(projectId!), {
    ready: !!projectId,
    refreshDeps: [projectId],
  });

  useUpdateEffect(() => {
    setReadyToRender(false);
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      setReadyToRender(true);
      return;
    }
    if (!project || project.id !== projectId) return;

    if (projectId !== currentProjectId) {
      resetLayerConfig();
      setCurrentProjectId(projectId);
    }
    setReadyToRender(true);
  }, [project, projectId]);

  const algorithm = useMemo(() => {
    return windowTheme === 'dark' ? theme.darkAlgorithm : theme.compactAlgorithm;
  }, [windowTheme]);

  const ready = size && readyToRender;

  return (
    <ConfigProvider
      theme={{
        algorithm: [algorithm, theme.compactAlgorithm],
      }}
    >
      <Container
        style={{
          background: windowTheme === 'dark' ? '#000' : '#fff',
        }}
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
      </Container>
    </ConfigProvider>
  );
};

export default DrawingPage;
