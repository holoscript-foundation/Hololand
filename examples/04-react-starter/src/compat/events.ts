type Listener = (...args: unknown[]) => void;

export class EventEmitter {
  private listeners = new Map<string | symbol, Set<Listener>>();

  on(event: string | symbol, listener: Listener): this {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    return this;
  }

  once(event: string | symbol, listener: Listener): this {
    const wrapped: Listener = (...args) => {
      this.off(event, wrapped);
      listener(...args);
    };
    return this.on(event, wrapped);
  }

  off(event: string | symbol, listener: Listener): this {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  removeListener(event: string | symbol, listener: Listener): this {
    return this.off(event, listener);
  }

  emit(event: string | symbol, ...args: unknown[]): boolean {
    const handlers = this.listeners.get(event);
    if (!handlers || handlers.size === 0) return false;
    for (const handler of [...handlers]) handler(...args);
    return true;
  }

  removeAllListeners(event?: string | symbol): this {
    if (event === undefined) {
      this.listeners.clear();
    } else {
      this.listeners.delete(event);
    }
    return this;
  }
}

export default { EventEmitter };
