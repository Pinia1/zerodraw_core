import { generateUUID } from '../utils';

type Message = {
  id: string;
  type: string;
  data: any;
};

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

  postMessage(message: Exclude<Message, 'id'>) {
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
    this.worker?.addEventListener('error', callback);
  }

  destroy() {
    this.worker?.terminate();
    this.worker = null;
  }
}
