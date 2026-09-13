import {
  Handle,
  Position,
  useNodes,
  useReactFlow,
  type NodeProps,
} from '@xyflow/react';
import { useHover, useMemoizedFn } from '@zeroDraw/common';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { ResizeHandle, Wrapper } from '../shared/nodeLayout';
import { MarkdownPreview } from '../shared/MarkdownPreview';
import { useNodeResize } from '../shared/useNodeResize';

const DEFAULT_SCRIPT = `# 分镜脚本

## 镜头 1
- **画面**：城市夜景，霓虹灯反射在雨后的路面
- **旁白**：「当最后一盏灯熄灭，故事才刚刚开始。」

## 镜头 2
- **画面**：特写参考图主体，缓慢推近
- **时长**：4s
`;

const NodeBody = styled.div`
  display: flex;
  flex-direction: column;
  background: #141414;
  border-radius: 12px;
  overflow: hidden;
`;

const NodeLabel = styled.div`
  flex-shrink: 0;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #888;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const Editor = styled.textarea`
  width: 100%;
  flex: 1;
  min-height: 120px;
  resize: none;
  border: none;
  outline: none;
  background: #141414;
  color: #f0f0f0;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.55;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
`;

const MarkdownNode: React.FC<NodeProps<MarkdownNode>> = (props) => {
  const { id, data, selected } = props;
  const {
    content = DEFAULT_SCRIPT,
    width = 300,
    height = 220,
    label = '脚本',
  } = data as MarkdownNode['data'];

  const { setNodes } = useReactFlow();
  const nodes = useNodes();
  const ref = useRef<HTMLDivElement>(null);
  const isHover = useHover(ref);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);

  useEffect(() => {
    if (!editing) setDraft(content);
  }, [content, editing]);

  const onPointerDown = useNodeResize({ id, width, height, minWidth: 200, minHeight: 120 });

  const commit = useMemoizedFn(() => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, content: draft, status: 'complete' } } : n,
      ),
    );
    setEditing(false);
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
    <Wrapper $selected={isHover || selected || editing} ref={ref}>
      <NodeBody style={{ width, minHeight: height }}>
        <NodeLabel>{label}</NodeLabel>
        {editing ? (
          <Editor
            className="nodrag nowheel"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Escape') {
                setDraft(content);
                setEditing(false);
              }
            }}
          />
        ) : (
          <MarkdownPreview content={content} onClick={() => setEditing(true)} />
        )}
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

export default memo(MarkdownNode);
