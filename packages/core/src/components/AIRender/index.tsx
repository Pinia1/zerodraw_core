import { CloseOutlined, LoadingOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useMemoizedFn, useMount } from '@zeroDraw/common';
import { Input, Slider, Tooltip } from 'antd';
import React, { useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import { useAIRender, type AIRenderStatus } from '../../hooks/useAIRender';
import useAIRenderStore from '../../store/useAIRenderStore';
import { CANVAS_CONTAINER_ID } from '../../utils/drawing';
import Container from '../Container';

const PROMPT_PRESETS: { label: string; prompt: string }[] = [
  { label: '概念艺术', prompt: 'concept art, detailed, vivid colors, cinematic lighting' },
  { label: '动漫', prompt: 'anime style, cel shading, vibrant colors, detailed' },
  { label: '水彩', prompt: 'watercolor painting, soft colors, artistic, dreamy' },
  { label: '赛博朋克', prompt: 'cyberpunk, neon lights, futuristic city, detailed' },
  { label: '写实', prompt: 'photorealistic, detailed textures, natural lighting' },
];
const MIN_H = 160;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function statusColor(s: AIRenderStatus): string {
  switch (s) {
    case 'ready': return '#52c41a';
    case 'rendering': return '#1677ff';
    case 'connecting': return '#faad14';
    case 'error': return '#ff4d4f';
    default: return '#8c8c8c';
  }
}

function statusText(s: AIRenderStatus): string {
  switch (s) {
    case 'ready': return '就绪';
    case 'rendering': return '渲染中';
    case 'connecting': return '连接中';
    case 'error': return '连接失败';
    default: return '未连接';
  }
}

interface AIRenderProps {}

const AIRender: React.FC<AIRenderProps> = () => {
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const [pos, setPos] = useState({ x: 80, y: 80 });
  const [size, setSize] = useState({ w: 320, h: 420 });
  const dragRef = useRef<{ startX: number; startY: number; x: number; y: number } | null>(null);

  const { visible, prompt, strength, steps, opacity, setVisible, setPrompt, setStrength, setSteps, setOpacity } =
    useAIRenderStore(useShallow((s) => s));

  const { status, resultImage, elapsedMs, error } = useAIRender();

  useMount(() => {
    const el = (document.getElementById(CANVAS_CONTAINER_ID) as HTMLElement | null) || document.body;
    setPortalEl(el);
  });

  const onMoveStart = useMemoizedFn((e: React.PointerEvent) => {
    if ((e.target as HTMLElement)?.closest?.('[data-no-drag]')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, x: pos.x, y: pos.y };

    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      setPos({
        x: dragRef.current.x + ev.clientX - dragRef.current.startX,
        y: dragRef.current.y + ev.clientY - dragRef.current.startY,
      });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  });

  if (!portalEl || !visible) return null;

  const x = clamp(pos.x, -2000, window.innerWidth - 40);
  const y = clamp(pos.y, -2000, window.innerHeight - 40);

  const node = (
    <Container
      style={{
        position: 'fixed',
        left: x,
        top: y,
        width: size.w,
        minHeight: MIN_H,
        borderRadius: 10,
        overflow: 'hidden',
        zIndex: 9999,
        userSelect: 'none',
        cursor: 'move',
        border: '1px solid rgba(0,0,0,0.12)',
        display: 'flex',
        flexDirection: 'column',
      }}
      onPointerDown={onMoveStart}
    >
      {/* 标题栏 */}
      <div style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', borderBottom: '1px solid rgba(128,128,128,0.15)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500 }}>
          <ThunderboltOutlined style={{ color: '#faad14' }} />
          AI 实时渲染
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor(status), display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: statusColor(status), fontWeight: 400 }}>{statusText(status)}</span>
          {status === 'rendering' && <LoadingOutlined style={{ fontSize: 11 }} />}
          {elapsedMs > 0 && <span style={{ fontSize: 10, color: '#8c8c8c' }}>{elapsedMs}ms</span>}
        </div>
        <div
          data-no-drag
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setVisible(false)}
          style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, cursor: 'pointer', opacity: 0.6 }}
          title="关闭"
        >
          <CloseOutlined style={{ fontSize: 12 }} />
        </div>
      </div>

      {/* 渲染结果 */}
      <div style={{ flex: 1, minHeight: 200, background: 'rgba(128,128,128,0.06)', position: 'relative', overflow: 'hidden' }}>
        {resultImage ? (
          <img
            draggable={false}
            src={resultImage}
            style={{ width: '100%', height: '100%', objectFit: 'contain', opacity, pointerEvents: 'none', display: 'block' }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8c8c8c', fontSize: 12 }}>
            {status === 'error' ? (
              <div style={{ padding: '0 16px', textAlign: 'center', color: '#ff4d4f', fontSize: 11 }}>
                {error}
                <br />
                <span style={{ color: '#8c8c8c' }}>请运行：python server.py</span>
              </div>
            ) : status === 'connecting' ? '连接中...' : '开始绘制后显示渲染结果'}
          </div>
        )}
      </div>

      {/* 设置区 */}
      <div data-no-drag onPointerDown={(e) => e.stopPropagation()} style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, borderTop: '1px solid rgba(128,128,128,0.15)' }}>
        <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 2 }}>Prompt</div>
        <Input.TextArea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          autoSize={{ minRows: 2, maxRows: 4 }}
          style={{ fontSize: 12, resize: 'none' }}
          placeholder="描述想要的风格，越具体越好"
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {PROMPT_PRESETS.map(({ label, prompt: p }) => (
            <button
              key={label}
              type="button"
              onClick={() => setPrompt(p)}
              style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 4,
                border: '1px solid rgba(128,128,128,0.3)',
                background: 'transparent',
                cursor: 'pointer',
                color: 'inherit',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginTop: 2 }}>
          <div>
            <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 2 }}>
              <Tooltip title="越高 AI 改动越大、越不像线稿；越低越保留草图结构">AI 强度 {strength.toFixed(2)}</Tooltip>
            </div>
            <Slider min={0.45} max={0.85} step={0.05} value={strength} onChange={setStrength} style={{ margin: '4px 0' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 2 }}>透明度 {Math.round(opacity * 100)}%</div>
            <Slider min={0.1} max={1} step={0.05} value={opacity} onChange={setOpacity} style={{ margin: '4px 0' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 2 }}>
              <Tooltip title="Z-Image 固定 9 步推理，此滑块暂不影响后端">步数 {steps}</Tooltip>
            </div>
            <Slider min={1} max={4} step={1} value={steps} onChange={setSteps} disabled style={{ margin: '4px 0' }} />
          </div>
        </div>
      </div>
    </Container>
  );

  return ReactDOM.createPortal(node, portalEl);
};

export default React.memo(AIRender);
