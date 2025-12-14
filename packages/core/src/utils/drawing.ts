import { getStroke } from 'perfect-freehand';
import type { Line } from '../types/Layers';
import { isMobile } from './platform';

/**图层控制宽度 */
export const PROMPT_WIDTH = isMobile ? 175 : 250;
/**右侧aside宽度 */
export const ASIDE_WIDTH = isMobile ? 175 : 250;
/**宽高比 */
export const RATIO = 16 / 9;
/**最大缩放比例 */
export const MAX_SCALE = 2000;
/**最小缩放比例 */
export const MIN_SCALE = 30;
/**画布宽度 */
export const WIDTH = 1920;
/**画布高度 */
export const HEIGHT = 1080;
/**缩小缩放比例 */
export const REDUCE_SCALE = 0.18;
/**增加缩放比例 */
export const INCREASE_SCALE = 0.02;

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

  // 调整这个值：1=不抽稀，2=50%，3=33%
  //TODO 可以调整两端尖锐度
  const step = 1;
  for (let i = 0; i < points.length; i += 2 * step) {
    pathPoint.push([points[i], points[i + 1]]);
  }

  const hardness = Math.max(0.1, line.hardness ?? 0);

  const taper = 1 - hardness < 0.1 ? false : 1 - hardness;
  const path = getSvgPathFromStroke(
    getStroke(pathPoint as number[][], {
      simulatePressure: true,
      size: line.strokeWidth ? line.strokeWidth / 2 : 2,
      thinning: line.suppress ? 0.6 : 0,
      smoothing: line.stabilizer || 0.2,
      streamline: 0.5,
      easing: (t: number) => Math.sin((t * Math.PI) / 2),
      start: { taper },
      end: { taper },
      last: false,
    })
  );
  return path;
};
