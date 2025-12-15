import { CloseOutlined } from '@ant-design/icons';
import { useMemoizedFn, useMount } from '@monorepo/common';
import React, { useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import useToolsStore from '../../store/useTools';
import { CANVAS_CONTAINER_ID } from '../../utils/drawing';
import Container from '../Container';

type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const MIN_W = 220;
const MIN_H = 90;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const ReferencePicture: React.FC = () => {
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const lastAutoSizedSrcRef = useRef<string>('');
  const dragStartRef = useRef<{
    type: 'move' | 'resize';
    handle?: Handle;
    startX: number;
    startY: number;
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const { referencePicture, updateReferencePicture, clearReferencePicture } = useToolsStore(
    useShallow((state) => ({
      referencePicture: state.referencePicture,
      updateReferencePicture: state.updateReferencePicture,
      clearReferencePicture: state.clearReferencePicture,
    }))
  );

  useMount(() => {
    const el =
      (document.getElementById(CANVAS_CONTAINER_ID) as HTMLElement | null) || document.body;
    setPortalEl(el);
  });

  const visible = !!referencePicture.visible && !!referencePicture.src;
  const locked = !!referencePicture.locked;

  const startPointerCapture = useMemoizedFn((e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  });

  const stopPointerCapture = useMemoizedFn((e: PointerEvent) => {
    try {
      // best-effort: nothing to do if not captured
      void e;
    } catch {
      // ignore
    }
  });

  const onGlobalPointerMove = useMemoizedFn((e: PointerEvent) => {
    const s = dragStartRef.current;
    if (!s) return;

    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;

    if (s.type === 'move') {
      const nextX = s.x + dx;
      const nextY = s.y + dy;
      updateReferencePicture({ x: nextX, y: nextY });
      return;
    }

    const handle = s.handle!;
    let x = s.x;
    let y = s.y;
    let w = s.w;
    let h = s.h;

    if (handle.includes('e')) {
      w = Math.max(MIN_W, s.w + dx);
    }
    if (handle.includes('s')) {
      h = Math.max(MIN_H, s.h + dy);
    }
    if (handle.includes('w')) {
      const nextW = Math.max(MIN_W, s.w - dx);
      const moved = s.w - nextW;
      x = s.x + dx + moved;
      w = nextW;
    }
    if (handle.includes('n')) {
      const nextH = Math.max(MIN_H, s.h - dy);
      const moved = s.h - nextH;
      y = s.y + dy + moved;
      h = nextH;
    }

    updateReferencePicture({ x, y, width: w, height: h });
  });

  const onGlobalPointerUp = useMemoizedFn((e: PointerEvent) => {
    if (!dragStartRef.current) return;
    dragStartRef.current = null;
    stopPointerCapture(e);
    window.removeEventListener('pointermove', onGlobalPointerMove);
    window.removeEventListener('pointerup', onGlobalPointerUp);
  });

  const beginMove = useMemoizedFn((e: React.PointerEvent) => {
    if (locked) return;
    if ((e.target as HTMLElement)?.closest?.('[data-no-drag="true"]')) return;

    startPointerCapture(e);
    dragStartRef.current = {
      type: 'move',
      startX: e.clientX,
      startY: e.clientY,
      x: referencePicture.x,
      y: referencePicture.y,
      w: referencePicture.width,
      h: referencePicture.height,
    };

    window.addEventListener('pointermove', onGlobalPointerMove);
    window.addEventListener('pointerup', onGlobalPointerUp);
  });

  const beginResize = useMemoizedFn((handle: Handle) => (e: React.PointerEvent) => {
    if (locked) return;
    e.stopPropagation();
    startPointerCapture(e);
    dragStartRef.current = {
      type: 'resize',
      handle,
      startX: e.clientX,
      startY: e.clientY,
      x: referencePicture.x,
      y: referencePicture.y,
      w: referencePicture.width,
      h: referencePicture.height,
    };
    window.addEventListener('pointermove', onGlobalPointerMove);
    window.addEventListener('pointerup', onGlobalPointerUp);
  });

  const handles = useMemo(() => {
    const base: React.CSSProperties = {
      position: 'absolute',
      width: 10,
      height: 10,
      background: 'rgba(255,255,255,0.9)',
      border: '1px solid rgba(0,0,0,0.25)',
      borderRadius: 2,
      zIndex: 2,
    };
    return [
      { k: 'nw' as const, style: { ...base, left: -5, top: -5, cursor: 'nwse-resize' } },
      { k: 'ne' as const, style: { ...base, right: -5, top: -5, cursor: 'nesw-resize' } },
      { k: 'sw' as const, style: { ...base, left: -5, bottom: -5, cursor: 'nesw-resize' } },
      { k: 'se' as const, style: { ...base, right: -5, bottom: -5, cursor: 'nwse-resize' } },
      {
        k: 'n' as const,
        style: { ...base, left: '50%', top: -5, marginLeft: -5, cursor: 'ns-resize' },
      },
      {
        k: 's' as const,
        style: { ...base, left: '50%', bottom: -5, marginLeft: -5, cursor: 'ns-resize' },
      },
      {
        k: 'w' as const,
        style: { ...base, left: -5, top: '50%', marginTop: -5, cursor: 'ew-resize' },
      },
      {
        k: 'e' as const,
        style: { ...base, right: -5, top: '50%', marginTop: -5, cursor: 'ew-resize' },
      },
    ];
  }, []);

  if (!portalEl || !visible) return null;

  const x = clamp(referencePicture.x, -2000, window.innerWidth - 40);
  const y = clamp(referencePicture.y, -2000, window.innerHeight - 40);
  const w = Math.max(MIN_W, referencePicture.width);
  const h = Math.max(MIN_H, referencePicture.height);

  const node = (
    <Container
      style={{
        position: 'fixed',
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 10,
        overflow: 'hidden',
        zIndex: 9999,
        userSelect: 'none',
        cursor: locked ? 'default' : 'move',
        border: '1px solid rgba(0,0,0,0.12)',
      }}
      onPointerDown={beginMove}
    >
      {/* header */}
      <div
        style={{
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          cursor: 'default',
        }}
      >
        <div style={{ fontSize: 12 }}>Reference Picture</div>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10 }}
          data-no-drag="true"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div
            data-no-drag="true"
            onClick={(e) => {
              e.stopPropagation();
              clearReferencePicture();
            }}
            style={{
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              cursor: 'pointer',
            }}
            title="关闭"
          >
            <CloseOutlined />
          </div>
        </div>
      </div>

      {/* content */}
      <div style={{ position: 'relative', width: '100%', height: `calc(100% - 36px)` }}>
        <img
          draggable={false}
          src={referencePicture.src}
          onLoad={(e) => {
            const img = e.currentTarget;
            const nw = img.naturalWidth || img.width;
            const nh = img.naturalHeight || img.height;
            if (!nw || !nh) return;

            // 仅在“首次加载/切换图片”时自动设置一次初始比例，避免覆盖用户手动调整尺寸
            if (lastAutoSizedSrcRef.current === referencePicture.src) return;
            lastAutoSizedSrcRef.current = referencePicture.src;

            const baseW = MIN_W; // 需求：按宽度=120 来计算
            const nextH = Math.max(MIN_H, Math.round((baseW * nh) / nw));
            updateReferencePicture({ width: baseW, height: nextH });
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            background: 'transparent',
            pointerEvents: 'none',
          }}
        />
        {!locked &&
          handles.map((h) => <div key={h.k} style={h.style} onPointerDown={beginResize(h.k)} />)}
      </div>
    </Container>
  );

  return ReactDOM.createPortal(node, portalEl);
};

export default React.memo(ReferencePicture);
