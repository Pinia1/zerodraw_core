import type Konva from 'konva';
import { getStroke } from 'perfect-freehand';
import type { Line } from '../types/Layers';
import { isMobile } from './platform';

/**最少点 */
export const MIN_POINT = isMobile ? 4 : 6;
/**图层控制宽度 */
export const PROMPT_WIDTH = 280;
/**右侧aside宽度 */
export const ASIDE_WIDTH = 280;
/**宽高比 */
export const RATIO = 16 / 9;
/**最大缩放比例 */
export const MAX_SCALE = 2000;
/**最小缩放比例 */
export const MIN_SCALE = 10;
/**画布宽度 */
export const WIDTH = 1920;
/**画布高度 */
export const HEIGHT = 1080;
/**缩小缩放比例 */
export const REDUCE_SCALE = 0.18;
/**增加缩放比例 */
export const INCREASE_SCALE = 0.02;

export const MAX_TAPER = 500;

export const CANVAS_CONTAINER_ID = 'canvas_container';

export const generateUUID = () => {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const TO_FIXED_PRECISION = /(\s?[A-Z]?,?-?[0-9]*\.[0-9]{0,2})(([0-9]|e|-)*)/g;

function med(A: number[], B: number[]) {
  return [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
}

export function getSvgPathFromStroke(points: number[][]): string {
  if (!points.length) {
    return '';
  }
  const max = points.length - 1;
  return points
    .reduce(
      (acc, point, i, arr) => {
        if (i === max) {
          acc.push(point, med(point, arr[0]), 'L', arr[0], 'Z');
        } else {
          acc.push(point, med(point, arr[i + 1]));
        }
        return acc;
      },
      ['M', points[0], 'Q']
    )
    .join(' ')
    .replace(TO_FIXED_PRECISION, '$1');
}

export const pint2DToPath = (points: number[], line: Partial<Line>) => {
  const pathPoint = [];
  const { suppress = false } = line;

  const step = 1;
  let pressureIndex = 0;
  for (let i = 0; i < points.length; i += 2 * step) {
    pathPoint.push([
      points[i],
      points[i + 1],
      suppress ? (line.pressure?.[pressureIndex] ?? 0.5) : 0.5,
    ]);
    pressureIndex++;
  }

  const taper = (line.hardness || 0) * MAX_TAPER;

  const path = getSvgPathFromStroke(
    getStroke(pathPoint as number[][], {
      simulatePressure: suppress, //速度模拟压感
      size: line.strokeWidth ? line.strokeWidth / 2 : 2,
      thinning: line.suppress ? 0.8 : 0,
      smoothing: line.stabilizer || 0.2,
      streamline: 0.5,
      easing: (t: number) => Math.sin((t * Math.PI) / 2),
      start: { taper },
      end: { taper },
      last: true,
    })
  );
  return path;
};

export const getTouchCenterAndDistance = (stage: Konva.Stage, touches: TouchList) => {
  const rect = stage.container().getBoundingClientRect();
  const t0 = touches[0];
  const t1 = touches[1];
  const p0 = { x: t0.clientX - rect.left, y: t0.clientY - rect.top };
  const p1 = { x: t1.clientX - rect.left, y: t1.clientY - rect.top };
  const center = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
  const dx = p0.x - p1.x;
  const dy = p0.y - p1.y;
  const distance = Math.hypot(dx, dy);
  return { center, distance };
};
