import type { BrushJSON, MyPaintEngine } from '@zeroDraw/wasm';
import MyPaint, { hexToHsv } from '@zeroDraw/wasm';
import { useEffect, useRef } from 'react';
import styled from 'styled-components';

interface BrushPreviewProps {
  config: BrushJSON;
}

let previewEnginePromise: Promise<MyPaintEngine> | null = null;

const getPreviewEngine = () => {
  if (!previewEnginePromise) {
    previewEnginePromise = MyPaint.create();
  }
  return previewEnginePromise;
};

const Canvas = styled.canvas`
  width: 160px;
  height: 56px;
  display: block;
  border-radius: 8px;
  background: var(--color-fill-tertiary);
`;

const BrushPreview = ({ config }: BrushPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;

    // 持有异步创建的 WASM 资源，确保无论何时 unmount 都能正确清理
    const resources: { destroy: () => void }[] = [];

    getPreviewEngine().then((engine) => {
      if (cancelled) return;

      const surface = engine.createSurface(160, 56);
      const brush = engine.createBrush();
      resources.push(brush, surface);

      // 若在资源创建完成后立即 unmount，直接清理退出
      if (cancelled) {
        brush.destroy();
        surface.destroy();
        return;
      }

      brush.fromJSON(config);
      const hsv = hexToHsv('#ffffff');
      brush
        .set('color_h', hsv.h)
        .set('color_s', hsv.s)
        .set('color_v', hsv.v)
        .set('radius_logarithmic', Math.log(6))
        .set('opaque', 1.4);

      const stroke = surface.bindBrush(brush);
      stroke.begin();
      for (let i = 0; i <= 28; i += 1) {
        const x = 14 + i * 5;
        const y = 30 + Math.sin(i / 3) * 8;
        stroke.to(x, y, 0.75, { dtime: 0.016 });
      }
      stroke.end();

      // 渲染前再检查一次，避免写入已移出 DOM 的 canvas
      if (cancelled) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        canvas.width = 160;
        canvas.height = 56;
        surface.renderToCanvas(ctx);
      }
    });

    return () => {
      cancelled = true;
      resources.forEach((r) => r.destroy());
    };
  }, [config]);

  return <Canvas ref={canvasRef} />;
};

export default BrushPreview;
