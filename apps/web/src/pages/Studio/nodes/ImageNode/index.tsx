import Icon, { DeleteOutlined } from '@ant-design/icons';
import {
  Handle,
  Position,
  useNodes,
  useReactFlow,
  useViewport,
  type NodeProps,
} from '@xyflow/react';
import { useHover, useMemoizedFn } from '@zeroDraw/common';
import { Container, Icons, ToolItem } from '@zeroDraw/agent-ui';
import { Image, Tooltip } from 'antd';
import React, { memo, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  ImageContainer,
  Placeholder,
  ResizeHandle,
  ToolbarWrapper,
  Wrapper,
} from '../shared/nodeLayout';
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
  position: relative;
  overflow: hidden;
  border-radius: 12px;
`;

const ImageContent = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`;

const StudioImageNode: React.FC<NodeProps<ImageNode>> = (props) => {
  const { id, data, selected } = props;
  const { src, width = 200, height = 200, label = '参考图' } = data as ImageNode['data'];

  const { setNodes } = useReactFlow();
  const nodes = useNodes();
  const { zoom } = useViewport();
  const ref = useRef<HTMLDivElement>(null);
  const isHover = useHover(ref);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const onPointerDown = useNodeResize({
    id,
    width,
    height,
    minWidth: 80,
    minHeight: 80,
    keepAspectRatio: true,
  });

  const handleDelete = useMemoizedFn(() => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
  });

  const multSelected = useMemo(() => nodes.filter((n) => n.selected).length > 1, [nodes]);

  const handleStyle = {
    width: 6,
    height: 6,
    background: '#fff',
    border: '1px solid #722ed1',
    opacity: selected ? 1 : 0,
  };

  return (
    <Wrapper $selected={isHover || selected} ref={ref}>
      {selected && !multSelected && (
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
            {src ? (
              <Tooltip title="预览">
                <ToolItem onClick={() => setPreviewVisible(true)} style={{ minWidth: 38 }}>
                  <Icon component={Icons.IconPreview} />
                </ToolItem>
              </Tooltip>
            ) : null}
            <Tooltip title="删除">
              <ToolItem onClick={handleDelete} style={{ minWidth: 38 }}>
                <DeleteOutlined />
              </ToolItem>
            </Tooltip>
          </Container>
        </ToolbarWrapper>
      )}

      <NodeBody style={{ width, height }}>
        <ImageContent>
          <LabelBadge>{label}</LabelBadge>
          <ImageContainer $width={width} $height={height}>
            {src ? (
              <Image
                preview={{
                  minScale: 0.5,
                  visible: previewVisible,
                  onVisibleChange: (visible) => {
                    if (!visible) setPreviewVisible(false);
                  },
                  getContainer: () => document.body,
                }}
                src={src}
                onError={() => setLoadError(true)}
              />
            ) : (
              <Placeholder>上传或拖入参考图</Placeholder>
            )}
            {loadError && (
              <Container>
                <Placeholder style={{ position: 'absolute', inset: 0, background: '#141414' }}>
                  <span>图片加载失败</span>
                </Placeholder>
              </Container>
            )}
          </ImageContainer>
        </ImageContent>
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

export default memo(StudioImageNode);
