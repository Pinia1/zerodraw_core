import { DeleteOutlined, ExclamationCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import {
  Handle,
  Position,
  useNodes,
  useReactFlow,
  useViewport,
  type NodeProps,
} from '@xyflow/react';
import { useHover, useMemoizedFn } from '@zeroDraw/common';
import { Container, ToolItem } from '@zeroDraw/agent-ui';
import { Spin, Tooltip } from 'antd';
import React, { memo, useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components';
import {
  Placeholder,
  ResizeHandle,
  ToolbarWrapper,
  Wrapper,
} from '../shared/nodeLayout';
import { MOCK_GENERATE_MS, MOCK_VIDEO_POSTER, MOCK_VIDEO_SRC } from '../shared/mockVideo';
import { useNodeResize } from '../shared/useNodeResize';

const LabelBadge = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #ddd;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
`;

const NodeBody = styled.div`
  overflow: hidden;
  border-radius: 12px;
  background: #0f0f0f;
`;

const VideoContent = styled.div`
  width: 100%;
  height: 100%;
  position: relative;

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    background: #000;
  }
`;

const VideoNode: React.FC<NodeProps<VideoNode>> = (props) => {
  const { id, data, selected } = props;
  const {
    src,
    poster = MOCK_VIDEO_POSTER,
    width = 320,
    height = 180,
    status = 'empty',
    error,
    label = '视频',
  } = data as VideoNode['data'];

  const { setNodes } = useReactFlow();
  const nodes = useNodes();
  const { zoom } = useViewport();
  const ref = useRef<HTMLDivElement>(null);
  const isHover = useHover(ref);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const onPointerDown = useNodeResize({
    id,
    width,
    height,
    minWidth: 160,
    minHeight: 90,
    keepAspectRatio: true,
  });

  const handleDelete = useMemoizedFn(() => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
  });

  const handleMockGenerate = useMemoizedFn(() => {
    if (status === 'generating') return;

    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, status: 'generating', error: undefined, src: undefined } }
          : n,
      ),
    );

    timerRef.current = window.setTimeout(() => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  status: 'ready',
                  src: MOCK_VIDEO_SRC,
                  poster: MOCK_VIDEO_POSTER,
                },
              }
            : n,
        ),
      );
    }, MOCK_GENERATE_MS);
  });

  const multSelected = useMemo(() => nodes.filter((n) => n.selected).length > 1, [nodes]);

  const handleStyle = {
    width: 6,
    height: 6,
    background: '#fff',
    border: '1px solid #722ed1',
    opacity: selected ? 1 : 0,
  };

  const showToolbar = selected && !multSelected;

  return (
    <Wrapper $selected={isHover || selected} ref={ref}>
      {showToolbar && (
        <ToolbarWrapper $zoom={zoom}>
          <Container
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              height: 42,
              padding: 6,
              borderRadius: 16,
            }}
          >
            <Tooltip title="模拟生成（Mock）">
              <ToolItem
                $disabled={status === 'generating'}
                onClick={handleMockGenerate}
                style={{ minWidth: 38 }}
              >
                <PlayCircleOutlined />
              </ToolItem>
            </Tooltip>
            <Tooltip title="删除">
              <ToolItem onClick={handleDelete} style={{ minWidth: 38 }}>
                <DeleteOutlined />
              </ToolItem>
            </Tooltip>
          </Container>
        </ToolbarWrapper>
      )}

      <NodeBody style={{ width, height }}>
        <VideoContent>
          <LabelBadge>{label}</LabelBadge>

          {status === 'ready' && src ? (
            <video src={src} poster={poster} controls playsInline preload="metadata" />
          ) : status === 'generating' ? (
            <Container>
              <Placeholder style={{ position: 'absolute', inset: 0, background: '#141414' }}>
                <Spin size="small" />
                <span>生成中…</span>
              </Placeholder>
            </Container>
          ) : status === 'failed' ? (
            <Container>
              <Placeholder style={{ position: 'absolute', inset: 0, background: '#141414' }}>
                <ExclamationCircleOutlined />
                <span>{error ?? '生成失败'}</span>
              </Placeholder>
            </Container>
          ) : (
            <Container>
              <Placeholder
                style={{ position: 'absolute', inset: 0, background: '#141414', cursor: 'pointer' }}
                onClick={handleMockGenerate}
              >
                <PlayCircleOutlined style={{ fontSize: 28, color: '#666' }} />
                <span>点击模拟生成视频</span>
              </Placeholder>
            </Container>
          )}
        </VideoContent>
      </NodeBody>

      <Handle type="source" position={Position.Right} style={handleStyle} />
      <Handle type="target" position={Position.Left} style={handleStyle} />

      {selected && !multSelected && (
        <>
          <ResizeHandle $corner="tl" onPointerDown={onPointerDown('tl')} />
          <ResizeHandle $corner="tr" onPointerDown={onPointerDown('tr')} />
          <ResizeHandle $corner="bl" onPointerDown={onPointerDown('bl')} />
          <ResizeHandle $corner="br" onPointerDown={onPointerDown('br')} />
        </>
      )}
    </Wrapper>
  );
};

export default memo(VideoNode);
