import { generateUUID } from '../utils';

type Message = {
  id: string;
  type: string;
  data: unknown;
};

type Rgba = [number, number, number, number];
type FillStop = { offset: number; color: string | Rgba } | { offset: number; rgba: string | Rgba };

interface PostMessageData {
  imageData: ImageData;
  posX: number;
  posY: number;
  tolerance: number;

  /**
   * 旧协议（兼容保留）：8 方向 + 均匀 stops
   */
  fillColor?: Array<Rgba>;
  direction?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

  /**
   * 新协议：任意角度 + 带 offset 的 stops
   * - angleDeg: 0°=→，90°=↓（屏幕坐标系）
   */
  angleDeg?: number;
  stops?: Array<FillStop>;
  gradient?: { angle: number; stops: Array<FillStop> };

  // 其余上下文（现状仍由业务侧自由传递）
  canvasConfig: Record<string, unknown>;
  groupPos: Record<string, unknown>;
}

enum Status {
  IDLE = 'idle',
  PENDING = 'pending',
}

export class WebWorker {
  private worker: Worker | null = null;

  private status: Status = Status.IDLE;
  private resolve: (value: Message) => void;
  private reject: (reason?: Error) => void;

  private instanceId: string = '';

  constructor(url: URL | string, errorHandler?: (error: Error) => void) {
    this.worker = new Worker(url, { type: 'module' });
    this.resolve = () => {};
    this.reject = () => {};
    this.onMessage();
    this.onError(errorHandler ? (event) => errorHandler(event.error) : () => {});
  }

  postMessage(message: PostMessageData) {
    return new Promise((resolve, reject) => {
      try {
        if (this.status === Status.PENDING) {
          return reject(new Error('Worker is busy'));
        }
        this.status = Status.PENDING;
        this.resolve = resolve;
        this.reject = reject;
        const id = generateUUID();
        this.instanceId = id;
        this.worker?.postMessage({
          ...message,
          id: this.instanceId,
        });
      } catch (error) {
        this.reject(error as unknown as Error);
      }
    });
  }

  private onMessage() {
    this.worker?.addEventListener('message', (event) => {
      const { id } = event.data;
      if (id === this.instanceId) {
        this.status = Status.IDLE;
        this.instanceId = '';

        this.resolve(event.data);
      }
    });
  }

  onError(callback: (event: ErrorEvent) => void) {
    this.worker?.addEventListener('error', (e) => {
      console.log(e, 'fill worker error');
      callback(e);
    });
  }

  destroy() {
    this.worker?.terminate();
    this.worker = null;
  }
}
