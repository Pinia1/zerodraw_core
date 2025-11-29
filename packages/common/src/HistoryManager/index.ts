export interface HistoryManagerOptions<T> {
  maxLength?: number;
  clone?: (value: T) => T;
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

  constructor(options: HistoryManagerOptions<T> = {}) {
    const { maxLength = Infinity, clone } = options;
    this.maxLength = maxLength;
    this.clone = clone;
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

    // 如果当前还没有值，视为初始化
    if (this.presentValue === null) {
      this.presentValue = next;
      return;
    }

    // 如果值完全相等，则不记录新历史，避免重复快照
    if (Object.is(this.presentValue, next)) {
      return;
    }

    this.past.push(this.presentValue);

    // 只限制 past 的长度
    if (this.maxLength !== Infinity && this.past.length > this.maxLength) {
      const overflow = this.past.length - this.maxLength;
      if (overflow > 0) {
        this.past.splice(0, overflow);
      }
    }

    this.presentValue = next;
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
