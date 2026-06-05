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
    let cleanup: (() => void) | undefined;

    getPreviewEngine().then((engine) => {
      if (cancelled) return;

      const width = 160;
      const height = 56;
      const surface = engine.createSurface(width, height);
      const brush = engine.createBrush();
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

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        canvas.width = width;
        canvas.height = height;
        surface.renderToCanvas(ctx);
      }

      cleanup = () => {
        brush.destroy();
        surface.destroy();
      };
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [config]);

  return <Canvas ref={canvasRef} />;
};

export default BrushPreview;
