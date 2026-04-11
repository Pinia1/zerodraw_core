import { useRequest, useSize } from '@zeroDraw/common';
import { Drawing, Tools, useDrawingStore } from '@zeroDraw/core';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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

  // 当 projectId 变化时先关掉画布，等数据和 reset 就绪后再开
  useEffect(() => {
    setReadyToRender(false);
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      setReadyToRender(true);
      return;
    }
    // 等待当前 projectId 对应的数据（避免使用上一个项目的 stale data）
    if (!project || project.id !== projectId) return;

    if (projectId !== currentProjectId) {
      resetLayerConfig();
      setCurrentProjectId(projectId);
    }
    setReadyToRender(true);
  }, [project, projectId]);

  const ready = size && readyToRender;

  return (
    <Container ref={containerRef}>
      {ready && (
        <Drawing
          key={projectId ?? 'default'}
          size={size!}
          tools={[Tools.TOOL, Tools.LAYERS_CONTROL, Tools.FLEXIBLE]}
          canvasWidth={project?.canvasWidth}
          canvasHeight={project?.canvasHeight}
        />
      )}
    </Container>
  );
};

export default DrawingPage;
