import { CanvasConfigTypes } from '../types/Drawing';

export const PROMPT_WIDTH = 250;
export const ASIDE_WIDTH = 250;
export const RATIO = 16 / 9;
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
