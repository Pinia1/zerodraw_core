export class ListNode<T> {
  value: T;
  next: ListNode<T> | null = null;
  prev: ListNode<T> | null = null;

  constructor(value: T) {
    this.value = value;
  }
}

export class DoublyLinkedList<T> {
  private head: ListNode<T> | null = null;
  private tail: ListNode<T> | null = null;
  private current: ListNode<T> | null = null;
  private _length = 0;
  private maxLength: number;
  private _headNode: ListNode<T> | null = null; // 记录最大长度限制下的头节点

  constructor(maxLength = Infinity) {
    this.maxLength = maxLength;
  }

  // 获取当前长度
  get length(): number {
    return this._length;
  }

  // 获取最大长度
  get maxSize(): number {
    return this.maxLength;
  }

  // 获取当前节点值
  get currentValue(): T | null {
    return this.current?.value ?? null;
  }

  // 获取头节点（考虑最大长度限制）
  get headNode(): ListNode<T> | null {
    return this._headNode || this.head;
  }

  // 添加新节点到链表尾部
  add(value: T): ListNode<T> {
    const newNode = new ListNode(value);

    if (!this.head) {
      this.head = newNode;
      this.tail = newNode;
      this.current = newNode;
      this._headNode = newNode;
    } else {
      newNode.prev = this.tail;
      this.tail!.next = newNode;
      this.tail = newNode;
      this.current = newNode;
    }

    this._length++;

    // 处理最大长度限制
    this.enforceMaxLength();

    return newNode;
  }

  // 执行最大长度限制
  private enforceMaxLength(): void {
    if (this._length > this.maxLength) {
      const nodesToRemove = this._length - this.maxLength;

      for (let i = 0; i < nodesToRemove; i++) {
        if (this.head) {
          this.head = this.head.next;
          if (this.head) {
            this.head.prev = null;
          } else {
            this.tail = null;
          }
          this._length--;
        }
      }

      // 更新头节点记录
      this._headNode = this.head;

      // 如果当前节点被移除了，设置为新的头节点
      if (this.current && !this.containsNode(this.current)) {
        this.current = this.head;
      }
    }
  }

  // 检查节点是否在当前链表中
  private containsNode(node: ListNode<T>): boolean {
    let current = this.head;
    while (current) {
      if (current === node) return true;
      current = current.next;
    }
    return false;
  }

  // 前进到下一个节点
  forward(): T | null {
    if (!this.current || !this.current.next) {
      return null;
    }

    this.current = this.current.next;
    return this.current.value;
  }

  // 后退到上一个节点
  backward(): T | null {
    if (!this.current || !this.current.prev) {
      return null;
    }

    this.current = this.current.prev;
    return this.current.value;
  }

  // 跳转到指定位置（0-based索引）
  goTo(index: number): T | null {
    if (index < 0 || index >= this._length) {
      return null;
    }

    let current = this.head;
    let currentIndex = 0;

    while (current && currentIndex < index) {
      current = current.next;
      currentIndex++;
    }

    if (current) {
      this.current = current;
      return current.value;
    }

    return null;
  }

  // 获取当前节点索引
  getCurrentIndex(): number {
    if (!this.current) return -1;

    let current = this.head;
    let index = 0;

    while (current && current !== this.current) {
      current = current.next;
      index++;
    }

    return current ? index : -1;
  }

  // 获取所有节点值（用于调试）
  toArray(): T[] {
    const result: T[] = [];
    let current = this.head;

    while (current) {
      result.push(current.value);
      current = current.next;
    }

    return result;
  }

  // 获取当前节点之后的所有节点值
  getForwardValues(): T[] {
    const result: T[] = [];
    let current = this.current;

    while (current) {
      result.push(current.value);
      current = current.next;
    }

    return result;
  }

  // 获取当前节点之前的所有节点值
  getBackwardValues(): T[] {
    const result: T[] = [];
    let current = this.current;

    while (current) {
      result.unshift(current.value);
      current = current.prev;
    }

    return result;
  }

  // 清空链表
  clear(): void {
    this.head = null;
    this.tail = null;
    this.current = null;
    this._headNode = null;
    this._length = 0;
  }

  // 删除当前节点
  removeCurrent(): T | null {
    if (!this.current) return null;

    const value = this.current.value;
    const nodeToRemove = this.current;

    // 更新前后节点的连接
    if (nodeToRemove.prev) {
      nodeToRemove.prev.next = nodeToRemove.next;
    } else {
      this.head = nodeToRemove.next;
      this._headNode = this.head; // 更新头节点
    }

    if (nodeToRemove.next) {
      nodeToRemove.next.prev = nodeToRemove.prev;
    } else {
      this.tail = nodeToRemove.prev;
    }

    // 更新当前节点
    this.current = nodeToRemove.next || nodeToRemove.prev;
    this._length--;

    return value;
  }

  // 获取链表状态信息
  getState() {
    return {
      length: this._length,
      maxLength: this.maxLength,
      currentIndex: this.getCurrentIndex(),
      currentValue: this.currentValue,
      headNodeValue: this.headNode?.value || null,
      canGoForward: !!this.current?.next,
      canGoBackward: !!this.current?.prev,
    };
  }
}
