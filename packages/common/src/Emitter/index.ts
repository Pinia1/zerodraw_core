type Listener<T> = (payload: T) => void;

/**
 * const emitter = new Emitter<{ change: Layers | null }>();
 * emitter.on('change', (val) => {});
 * emitter.emit('change', data);
 */
export class Emitter<Events extends Record<string, unknown> = Record<string, unknown>> {
  private listeners: Map<keyof Events, Set<Listener<any>>> = new Map();

  on<K extends keyof Events>(event: K, handler: Listener<Events[K]>): () => void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(handler as Listener<any>);
    this.listeners.set(event, set);
    return () => this.off(event, handler);
  }

  once<K extends keyof Events>(event: K, handler: Listener<Events[K]>): () => void {
    const wrapper: Listener<Events[K]> = (payload) => {
      this.off(event, wrapper);
      handler(payload);
    };
    return this.on(event, wrapper);
  }

  off<K extends keyof Events>(event: K, handler?: Listener<Events[K]>): void {
    const set = this.listeners.get(event);
    if (!set) return;
    if (handler) {
      set.delete(handler as Listener<any>);
    } else {
      set.clear();
    }
    if (set.size === 0) {
      this.listeners.delete(event);
    }
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.forEach((fn) => fn(payload));
  }

  clear(): void {
    this.listeners.clear();
  }
}
