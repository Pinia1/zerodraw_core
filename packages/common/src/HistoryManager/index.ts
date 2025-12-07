export interface HistoryManagerOptions<T> {
  maxLength?: number;
  clone?: (value: T) => T;

  //clean future callback
  cleanFutureCallback?: (future: T[]) => void;

  //clean past callback
  cleanPastCallback?: (past: T[]) => void;
}

export interface HistorySnapshot<T> {
  past: T[];
  present: T | null;
  future: T[];
}

export class HistoryManager<T> {
  private past: T[] = [];
  private future: T[] = [];
  private presentValue: T | null = null;

  private readonly maxLength: number;
  private readonly clone?: (value: T) => T;
  private readonly cleanFutureCallback?: (future: T[]) => void;
  private readonly cleanPastCallback?: (past: T[]) => void;

  constructor(options: HistoryManagerOptions<T> = {}) {
    const { maxLength = Infinity, clone, cleanFutureCallback, cleanPastCallback } = options;
    this.maxLength = maxLength;
    this.clone = clone;
    this.cleanFutureCallback = cleanFutureCallback;
    this.cleanPastCallback = cleanPastCallback;
  }

  /**
   * 当前值
   */
  get present(): T | null {
    return this.presentValue;
  }

  /**
   * 是否可以撤销 / 前进
   */
  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  /**
   * 设置初始值并清空历史
   */
  setInitial(value: T): void {
    const v = this.cloneValue(value);
    this.past = [];
    this.future = [];
    this.presentValue = v;
  }

  /**
   * 推入一个新的状态，会清空「未来」分支
   */
  push(value: T): void {
    const next = this.cloneValue(value);

    if (this.presentValue === null) {
      this.presentValue = next;
      return;
    }

    if (Object.is(this.presentValue, next)) {
      return;
    }

    // 1) 先把当前 present 收进 past
    this.past.push(this.presentValue);

    // 2) 如果过去超出 maxLength，裁剪“最老的一批”并触发 cleanPastCallback
    if (this.maxLength !== Infinity && this.past.length > this.maxLength) {
      const overflow = this.past.length - this.maxLength;
      if (overflow > 0) {
        const removedPast = this.past.splice(0, overflow); // 这次被扔掉的 past
        if (removedPast.length && this.cleanPastCallback) {
          this.cleanPastCallback(removedPast);
        }
      }
    }

    // 3) 设置新的 present
    this.presentValue = next;

    // 4) 丢掉整个 future 分支，并触发 cleanFutureCallback
    if (this.future.length && this.cleanFutureCallback) {
      const removedFuture = [...this.future]; // 复制一份本次要扔掉的 future
      this.cleanFutureCallback(removedFuture);
    }
    this.future = [];
  }

  /**
   * 撤销到上一个状态
   * 返回撤销后的当前值（如果无法撤销则返回原值）
   */
  undo(): T | null {
    if (!this.canUndo || this.presentValue === null) {
      return this.presentValue;
    }

    const previous = this.past.pop() as T;
    this.future.unshift(this.presentValue);
    this.presentValue = previous;
    return this.presentValue;
  }

  /**
   * 前进到下一个状态
   * 返回前进后的当前值（如果无法前进则返回原值）
   */
  redo(): T | null {
    if (!this.canRedo || this.presentValue === null) {
      return this.presentValue;
    }

    const next = this.future.shift() as T;
    this.past.push(this.presentValue);
    this.presentValue = next;
    return this.presentValue;
  }

  /**
   * 清空历史但保留当前值
   */
  clearHistory(): void {
    this.past = [];
    this.future = [];
  }

  /**
   * 替换当前值（不变更 past/future），常用于就地更新 present
   */
  replaceCurrent(value: T): void {
    const next = this.cloneValue(value);
    this.presentValue = next;
  }

  /**
   * 清空所有内容（包括当前值）
   */
  clearAll(): void {
    this.past = [];
    this.future = [];
    this.presentValue = null;
  }

  /**
   * 获取当前完整快照（调试 / 显示用）
   */
  getSnapshot(): HistorySnapshot<T> {
    return {
      past: [...this.past],
      present: this.presentValue,
      future: [...this.future],
    };
  }

  private cloneValue(value: T): T {
    return this.clone ? this.clone(value) : value;
  }
}
