import { PictureOutlined } from '@ant-design/icons';
import {
  Handle,
  Position,
  useNodes,
  useReactFlow,
  useViewport,
  type NodeProps,
} from '@xyflow/react';
import { useHover, useMemoizedFn, useRequest } from '@zeroDraw/common';
import { Image } from 'antd';
import React, { memo, useMemo, useRef, useState } from 'react';
import { httpGetTask } from '../../../../services/generate';
import { apiUrl, fileUrl } from '../../../../utils';
import {
  Corner,
  ImageContainer,
  Placeholder,
  ResizeHandle,
  ToolbarWrapper,
  Wrapper,
} from './components';
import ImageTool from './components/Tool';

interface ImageNodeData {
  label?: string;
  src?: string;
  width?: number;
  height?: number;
  name?: string;
  [key: string]: unknown;
}

const MIN_SIZE = 40;

const ImageNode: React.FC<NodeProps> = (props) => {
  const { id, data, selected } = props;
  const { taskId } = data;
  const { src = '/zero.png', width = 119, height = 117, name = '' } = data as ImageNodeData;
  const { getNode, setNodes, getZoom } = useReactFlow();
  const nodes = useNodes();
  const { zoom } = useViewport();
  const ref = useRef<HTMLDivElement>(null);
  const isHover = useHover(ref);
  const [previewVisible, setPreviewVisible] = useState(false);

  const { cancel } = useRequest(() => httpGetTask(taskId as string), {
    manual: !taskId,
    onSuccess: (data) => {
      if (['completed', 'failed'].includes(data.status)) {
        cancel();
      }
      if (data.s3Key) {
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id !== id) return n;
            return {
              ...n,
              data: {
                ...n.data,
                src: `${apiUrl}${fileUrl}/${data.s3Key}`,
                s3Key: data.s3Key,
              },
            };
          })
        );
      }
    },
    onError() {
      cancel();
    },
    pollingInterval: 2000,
  });

  const dragRef = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    startNodeX: number;
    startNodeY: number;
    corner: Corner;
    ratio: number;
    zoom: number;
    rafId: number | null;
  } | null>(null);

  const onPointerDown = useMemoizedFn((corner: Corner) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    const node = getNode(id);
    if (!node) return;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: width,
      startH: height,
      startNodeX: node.position.x,
      startNodeY: node.position.y,
      corner,
      ratio: width / height,
      zoom: getZoom(),
      rafId: null,
    };

    const onPointerMove = (ev: PointerEvent) => {
      const state = dragRef.current;
      if (!state) return;

      if (state.rafId !== null) cancelAnimationFrame(state.rafId);

      state.rafId = requestAnimationFrame(() => {
        const {
          startX,
          startY,
          startW,
          startH,
          startNodeX,
          startNodeY,
          corner: c,
          ratio: r,
          zoom,
        } = state;

        // 屏幕像素 → 画布坐标：除以 zoom
        const dx = (ev.clientX - startX) / zoom;
        const dy = (ev.clientY - startY) / zoom;

        let newW: number;
        let newH: number;

        // 根据拖拽角，用对角线方向的分量来决定缩放量
        // tl/br 用 (dx + dy)，tr/bl 用 (dx - dy)，再除以 2 取平均
        switch (c) {
          case 'br':
            newW = startW + ((dx + dy) * r) / (r + 1);
            break;
          case 'tl':
            newW = startW - ((dx + dy) * r) / (r + 1);
            break;
          case 'tr':
            newW = startW + ((dx - dy) * r) / (r + 1);
            break;
          case 'bl':
            newW = startW - ((dx - dy) * r) / (r + 1);
            break;
          default:
            newW = startW;
        }

        // 限制最小尺寸，保持宽高比
        newW = Math.max(MIN_SIZE, Math.round(newW));
        newH = Math.max(MIN_SIZE, Math.round(newW / r));
        // 如果高度被 MIN_SIZE 限制了，反算宽度
        newW = Math.round(newH * r);

        // 计算节点位置偏移，让对角固定
        let offsetX = 0;
        let offsetY = 0;
        if (c === 'tl') {
          offsetX = startW - newW;
          offsetY = startH - newH;
        } else if (c === 'tr') {
          offsetY = startH - newH;
        } else if (c === 'bl') {
          offsetX = startW - newW;
        }
        // br: 右下角拖拽，左上角不动，无偏移

        setNodes((nds) =>
          nds.map((n) => {
            if (n.id !== id) return n;
            return {
              ...n,
              position: {
                x: startNodeX + offsetX,
                y: startNodeY + offsetY,
              },
              data: { ...n.data, width: newW, height: newH },
            };
          })
        );
      });
    };

    const onPointerUp = () => {
      if (dragRef.current?.rafId !== null) {
        cancelAnimationFrame(dragRef.current!.rafId!);
      }
      dragRef.current = null;
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  });

  const multSelected = useMemo(() => {
    return nodes.filter((n) => n.selected).length > 1;
  }, [nodes]);

  const handleStyle = useMemo(() => {
    return {
      width: 6,
      height: 6,
      background: '#fff',
      border: '1px solid #722ed1',
      opacity: selected ? 1 : 0,
    };
  }, [selected]);

  return (
    <Wrapper $selected={isHover || selected} ref={ref}>
      {selected && !multSelected && (
        <ToolbarWrapper $zoom={zoom}>
          <ImageTool {...props} setPreviewVisible={setPreviewVisible} />
        </ToolbarWrapper>
      )}

      <ImageContainer $width={width} $height={height}>
        {src ? (
          <Image
            preview={{
              mask: false,
              visible: previewVisible,
              maskClosable: true,
              onVisibleChange: (visible) => {
                if (!visible) {
                  setPreviewVisible(false);
                }
              },
            }}
            src={src}
            alt={name}
            draggable={false}
          />
        ) : (
          <Placeholder>
            <PictureOutlined style={{ fontSize: 24 }} />
            <span style={{ fontSize: 11 }}>暂无图片</span>
          </Placeholder>
        )}
      </ImageContainer>

      <Handle type="source" position={Position.Right} style={handleStyle} />
      <Handle type="target" position={Position.Left} style={handleStyle} />

      {selected && (
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

export default memo(ImageNode);
