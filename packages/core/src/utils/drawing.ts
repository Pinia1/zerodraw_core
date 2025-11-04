import { CanvasConfigTypes } from '../types/Drawing';

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
/**初始化配置 */
export const initConfig: CanvasConfigTypes = {
  scale: 1,
  stagePosition: { x: 0, y: 0 },
  canvasInfo: {
    width: 0,
    height: 0,
    x: 0,
    y: 0,
  },
  showLineConfig: false,
  lineConfigPostion: {
    x: 0,
    y: 0,
  },
  lineInfoConfig: {
    size: 2, // 0 - 250
    opacity: 1, //0 - 1
    stabilizer: 0.5, // 0 - 2
    hardness: 1, //0-1
    color: '#2a2a2a',
    amendment: false,
    suppress: true,
    amendmentValue: 0,
  },
  eraserInfoConfig: {
    size: 10, // 0 - 250
    opacity: 1, //0 - 1
    stabilizer: 0, // 0 - 4
    hardness: 0.7, //0-1
    color: '#2a2a2a',
    amendment: true,
    suppress: true,
  },
  smearInfoConfig: {
    size: 1,
    color: '#acc3f7',
    opacity: 1,
    suppress: false,
  },
  fillColor: '#000000',
  layerBackground: '#ffffff',
  activeKey: '',
};
