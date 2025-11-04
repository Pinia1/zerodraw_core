export interface Point2D {
  x: number;
  y: number;
}

export interface CanvasConfigTypes {
  /**画布缩放属性 */
  scale: number;
  /**画布缩位置属性 */
  stagePosition: {
    x: number;
    y: number;
  };
  /**layer属性 */
  canvasInfo: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
  /**是否展示画笔橡皮编辑 */
  showLineConfig: boolean;
  /**activeKey */
  activeKey: string;
  /**画笔编辑相对位置 */
  lineConfigPostion: {
    x: number;
    y: number;
  };
  /**画笔编辑属性 */
  lineInfoConfig: {
    size: number; // 1 - 250
    opacity: number; //0 - 1
    stabilizer: number; // 0 - 4
    hardness: number; //0-1
    color: string;
    amendment: boolean;
    suppress: boolean;
    amendmentValue: number;
  };
  /**橡皮编辑属性 */
  eraserInfoConfig: {
    size: number; // 1 - 250
    opacity: number; //0 - 1
    stabilizer: number; // 0 - 4
    hardness: number; //0-1
    color: string;
    amendment: boolean;
    suppress: boolean;
  };
  // 涂抹选取属性
  smearInfoConfig: {
    size: number;
    color: string;
    opacity: number;
    suppress: boolean;
    [key: string]: any;
  };
  //填充颜色
  fillColor: string;
  //layer 背景色
  layerBackground: string;
}

export interface StageConfigTypes extends Point2D {
  scale: number;
}

export interface LayerConfigTypes extends Point2D {
  width: number;
  height: number;
}
