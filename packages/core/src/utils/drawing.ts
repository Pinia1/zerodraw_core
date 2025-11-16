import { getStroke } from 'perfect-freehand';
import type { Line } from '../types/Layers';

/**图层控制宽度 */
export const PROMPT_WIDTH = 250;
/**右侧aside宽度 */
export const ASIDE_WIDTH = 250;
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
  if (window.crypto) {
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

export const pint2DToPath = (points: number[], line: Line) => {
  const pathPoint = [];
  for (let i = 0; i < points.length; i += 2) {
    pathPoint.push([points[i], points[i + 1]]);
  }

  const taper = 1 - (line.hardness ?? 0) < 0.1 ? false : 1 - (line.hardness ?? 0);
  const path = getSvgPathFromStroke(
    getStroke(pathPoint as number[][], {
      simulatePressure: true,
      size: line.strokeWidth / 2,
      thinning: line.suppress ? 0.6 : 0,
      smoothing: line.stabilizer,
      streamline: 0.5,
      easing: (t: number) => Math.sin((t * Math.PI) / 2),
      start: { taper },
      end: { taper },
      last: false,
    })
  );
  return path;
};
