/**
 * CRDT (Conflict-free Replicated Data Types)
 *
 * Provides convergent data structures for distributed state synchronization.
 * These guarantee eventual consistency without coordination.
 *
 * @module crdt
 */

// =============================================================================
// Vector Clock
// =============================================================================

export interface VectorClock {
  [nodeId: string]: number;
}

export function createVectorClock(nodeId?: string): VectorClock {
  const clock: VectorClock = {};
  if (nodeId) clock[nodeId] = 0;
  return clock;
}

export function incrementClock(clock: VectorClock, nodeId: string): VectorClock {
  const next = { ...clock };
  next[nodeId] = (next[nodeId] || 0) + 1;
  return next;
}

export function mergeClock(a: VectorClock, b: VectorClock): VectorClock {
  const merged: VectorClock = { ...a };
  for (const [nodeId, ts] of Object.entries(b)) {
    merged[nodeId] = Math.max(merged[nodeId] || 0, ts);
  }
  return merged;
}

export type ClockOrder = 'before' | 'after' | 'concurrent' | 'equal';

export function compareClock(a: VectorClock, b: VectorClock): ClockOrder {
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let aLess = false;
  let bLess = false;

  for (const key of allKeys) {
    const va = a[key] || 0;
    const vb = b[key] || 0;
    if (va < vb) aLess = true;
    if (va > vb) bLess = true;
  }

  if (!aLess && !bLess) return 'equal';
  if (aLess && !bLess) return 'before';
  if (!aLess && bLess) return 'after';
  return 'concurrent';
}

// =============================================================================
// G-Counter (Grow-only Counter)
// =============================================================================

export class GCounter {
  private counts: Map<string, number> = new Map();
  readonly nodeId: string;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.counts.set(nodeId, 0);
  }

  increment(amount: number = 1): void {
    if (amount < 0) throw new Error('GCounter only supports positive increments');
    this.counts.set(this.nodeId, (this.counts.get(this.nodeId) || 0) + amount);
  }

  value(): number {
    let total = 0;
    for (const v of this.counts.values()) total += v;
    return total;
  }

  merge(other: GCounter): void {
    for (const [nodeId, count] of other.counts) {
      this.counts.set(nodeId, Math.max(this.counts.get(nodeId) || 0, count));
    }
  }

  toJSON(): Record<string, number> {
    return Object.fromEntries(this.counts);
  }

  static fromJSON(nodeId: string, data: Record<string, number>): GCounter {
    const counter = new GCounter(nodeId);
    for (const [k, v] of Object.entries(data)) {
      counter.counts.set(k, v);
    }
    return counter;
  }
}

// =============================================================================
// PN-Counter (Positive-Negative Counter)
// =============================================================================

export class PNCounter {
  private positive: GCounter;
  private negative: GCounter;
  readonly nodeId: string;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.positive = new GCounter(nodeId);
    this.negative = new GCounter(nodeId);
  }

  increment(amount: number = 1): void {
    this.positive.increment(amount);
  }

  decrement(amount: number = 1): void {
    this.negative.increment(amount);
  }

  value(): number {
    return this.positive.value() - this.negative.value();
  }

  merge(other: PNCounter): void {
    this.positive.merge(other.positive);
    this.negative.merge(other.negative);
  }

  toJSON(): { positive: Record<string, number>; negative: Record<string, number> } {
    return { positive: this.positive.toJSON(), negative: this.negative.toJSON() };
  }
}

// =============================================================================
// G-Set (Grow-only Set)
// =============================================================================

export class GSet<T> {
  private elements: Set<T> = new Set();

  add(element: T): void {
    this.elements.add(element);
  }

  has(element: T): boolean {
    return this.elements.has(element);
  }

  values(): T[] {
    return Array.from(this.elements);
  }

  size(): number {
    return this.elements.size;
  }

  merge(other: GSet<T>): void {
    for (const element of other.elements) {
      this.elements.add(element);
    }
  }

  toJSON(): T[] {
    return this.values();
  }
}

// =============================================================================
// 2P-Set (Two-Phase Set)
// =============================================================================

export class TwoPSet<T> {
  private addSet: GSet<T> = new GSet();
  private removeSet: GSet<T> = new GSet();

  add(element: T): void {
    this.addSet.add(element);
  }

  remove(element: T): void {
    if (this.addSet.has(element)) {
      this.removeSet.add(element);
    }
  }

  has(element: T): boolean {
    return this.addSet.has(element) && !this.removeSet.has(element);
  }

  values(): T[] {
    return this.addSet.values().filter((e) => !this.removeSet.has(e));
  }

  size(): number {
    return this.values().length;
  }

  merge(other: TwoPSet<T>): void {
    this.addSet.merge(other.addSet);
    this.removeSet.merge(other.removeSet);
  }

  toJSON(): { added: T[]; removed: T[] } {
    return { added: this.addSet.toJSON(), removed: this.removeSet.toJSON() };
  }
}

// =============================================================================
// OR-Set (Observed-Remove Set)
// =============================================================================

interface ORSetEntry<T> {
  value: T;
  tag: string;
  removed: boolean;
}

export class ORSet<T> {
  private entries: Map<string, ORSetEntry<T>> = new Map();
  readonly nodeId: string;
  private tagCounter: number = 0;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  add(value: T): void {
    const tag = `${this.nodeId}_${++this.tagCounter}`;
    this.entries.set(tag, { value, tag, removed: false });
  }

  remove(value: T): void {
    for (const [tag, entry] of this.entries) {
      if (entry.value === value && !entry.removed) {
        entry.removed = true;
      }
    }
  }

  has(value: T): boolean {
    for (const entry of this.entries.values()) {
      if (entry.value === value && !entry.removed) return true;
    }
    return false;
  }

  values(): T[] {
    const seen = new Set<T>();
    const result: T[] = [];
    for (const entry of this.entries.values()) {
      if (!entry.removed && !seen.has(entry.value)) {
        seen.add(entry.value);
        result.push(entry.value);
      }
    }
    return result;
  }

  size(): number {
    return this.values().length;
  }

  merge(other: ORSet<T>): void {
    for (const [tag, entry] of other.entries) {
      const existing = this.entries.get(tag);
      if (!existing) {
        this.entries.set(tag, { ...entry });
      } else if (entry.removed) {
        existing.removed = true;
      }
    }
  }

  toJSON(): ORSetEntry<T>[] {
    return Array.from(this.entries.values());
  }
}

// =============================================================================
// LWW-Register (Last-Writer-Wins Register)
// =============================================================================

export class LWWRegister<T> {
  private _value: T;
  private _timestamp: number;
  readonly nodeId: string;

  constructor(nodeId: string, initialValue: T) {
    this.nodeId = nodeId;
    this._value = initialValue;
    this._timestamp = Date.now();
  }

  set(value: T, timestamp?: number): void {
    const ts = timestamp ?? Date.now();
    if (ts >= this._timestamp) {
      this._value = value;
      this._timestamp = ts;
    }
  }

  get value(): T {
    return this._value;
  }

  get timestamp(): number {
    return this._timestamp;
  }

  merge(other: LWWRegister<T>): void {
    if (other._timestamp > this._timestamp) {
      this._value = other._value;
      this._timestamp = other._timestamp;
    }
  }

  toJSON(): { value: T; timestamp: number } {
    return { value: this._value, timestamp: this._timestamp };
  }
}

// =============================================================================
// MV-Register (Multi-Value Register)
// =============================================================================

interface MVEntry<T> {
  value: T;
  clock: VectorClock;
}

export class MVRegister<T> {
  private entries: MVEntry<T>[] = [];
  readonly nodeId: string;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  set(value: T): void {
    const clock = createVectorClock(this.nodeId);
    // Merge all existing clocks and increment
    for (const entry of this.entries) {
      Object.assign(clock, mergeClock(clock, entry.clock));
    }
    clock[this.nodeId] = (clock[this.nodeId] || 0) + 1;
    this.entries = [{ value, clock }];
  }

  get values(): T[] {
    return this.entries.map((e) => e.value);
  }

  get value(): T | undefined {
    return this.entries.length > 0 ? this.entries[0].value : undefined;
  }

  merge(other: MVRegister<T>): void {
    const combined = [...this.entries, ...other.entries];
    // Keep only entries not dominated by others
    const kept: MVEntry<T>[] = [];
    for (const entry of combined) {
      let dominated = false;
      for (const other of combined) {
        if (entry === other) continue;
        const cmp = compareClock(entry.clock, other.clock);
        if (cmp === 'before') {
          dominated = true;
          break;
        }
      }
      if (!dominated) kept.push(entry);
    }
    this.entries = kept;
  }

  toJSON(): MVEntry<T>[] {
    return this.entries;
  }
}

// =============================================================================
// LWW-Map (Last-Writer-Wins Map)
// =============================================================================

export class LWWMap<V> {
  private registers: Map<string, LWWRegister<V | null>> = new Map();
  readonly nodeId: string;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  set(key: string, value: V, timestamp?: number): void {
    const reg = this.registers.get(key);
    if (reg) {
      reg.set(value, timestamp);
    } else {
      const newReg = new LWWRegister<V | null>(this.nodeId, value);
      if (timestamp) newReg.set(value, timestamp);
      this.registers.set(key, newReg);
    }
  }

  get(key: string): V | null | undefined {
    const reg = this.registers.get(key);
    return reg ? reg.value : undefined;
  }

  delete(key: string, timestamp?: number): void {
    const reg = this.registers.get(key);
    if (reg) {
      reg.set(null, timestamp);
    }
  }

  has(key: string): boolean {
    const reg = this.registers.get(key);
    return reg !== undefined && reg.value !== null;
  }

  keys(): string[] {
    return Array.from(this.registers.entries())
      .filter(([, reg]) => reg.value !== null)
      .map(([key]) => key);
  }

  entries(): [string, V][] {
    return Array.from(this.registers.entries())
      .filter(([, reg]) => reg.value !== null)
      .map(([key, reg]) => [key, reg.value as V]);
  }

  size(): number {
    return this.keys().length;
  }

  merge(other: LWWMap<V>): void {
    for (const [key, otherReg] of other.registers) {
      const reg = this.registers.get(key);
      if (reg) {
        reg.merge(otherReg);
      } else {
        const newReg = new LWWRegister<V | null>(this.nodeId, otherReg.value);
        (newReg as any)._timestamp = otherReg.timestamp;
        (newReg as any)._value = otherReg.value;
        this.registers.set(key, newReg);
      }
    }
  }

  toJSON(): Record<string, { value: V | null; timestamp: number }> {
    const result: Record<string, { value: V | null; timestamp: number }> = {};
    for (const [key, reg] of this.registers) {
      result[key] = reg.toJSON();
    }
    return result;
  }
}

// =============================================================================
// RGA-Sequence (Replicated Growable Array)
// =============================================================================

interface RGANode<T> {
  id: string;
  value: T | null; // null = tombstone
  timestamp: number;
  after: string | null; // ID of the node this was inserted after
}

export class RGASequence<T> {
  private nodes: Map<string, RGANode<T>> = new Map();
  private order: string[] = [];
  readonly nodeId: string;
  private counter: number = 0;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  insert(index: number, value: T): string {
    const id = `${this.nodeId}_${++this.counter}`;
    const after = index > 0 && this.order.length > 0 ? this.order[Math.min(index - 1, this.order.length - 1)] : null;

    const node: RGANode<T> = { id, value, timestamp: Date.now(), after };
    this.nodes.set(id, node);

    // Insert at position
    const liveNodes = this.getLiveOrder();
    const insertAt = Math.min(index, liveNodes.length);
    this.order.splice(this.order.indexOf(liveNodes[insertAt - 1] || '') + 1 || insertAt, 0, id);

    if (this.order.indexOf(id) === -1) {
      this.order.push(id);
    }

    return id;
  }

  append(value: T): string {
    return this.insert(this.length(), value);
  }

  remove(index: number): void {
    const liveNodes = this.getLiveOrder();
    if (index < 0 || index >= liveNodes.length) return;
    const node = this.nodes.get(liveNodes[index]);
    if (node) node.value = null;
  }

  get(index: number): T | undefined {
    const liveNodes = this.getLiveOrder();
    if (index < 0 || index >= liveNodes.length) return undefined;
    return this.nodes.get(liveNodes[index])?.value ?? undefined;
  }

  values(): T[] {
    return this.getLiveOrder()
      .map((id) => this.nodes.get(id)?.value)
      .filter((v): v is T => v !== null && v !== undefined);
  }

  length(): number {
    return this.getLiveOrder().length;
  }

  private getLiveOrder(): string[] {
    return this.order.filter((id) => {
      const node = this.nodes.get(id);
      return node && node.value !== null;
    });
  }

  merge(other: RGASequence<T>): void {
    for (const [id, node] of other.nodes) {
      const existing = this.nodes.get(id);
      if (!existing) {
        this.nodes.set(id, { ...node });
        if (!this.order.includes(id)) {
          // Find insert position based on 'after' pointer
          if (node.after) {
            const afterIdx = this.order.indexOf(node.after);
            if (afterIdx >= 0) {
              this.order.splice(afterIdx + 1, 0, id);
            } else {
              this.order.push(id);
            }
          } else {
            this.order.unshift(id);
          }
        }
      } else if (node.value === null && existing.value !== null) {
        // Remote tombstone
        existing.value = null;
      }
    }
  }

  toJSON(): RGANode<T>[] {
    return this.order.map((id) => this.nodes.get(id)!).filter(Boolean);
  }
}

// =============================================================================
// JSON Document (CRDT-backed arbitrary JSON)
// =============================================================================

export class JSONDoc {
  private map: LWWMap<any>;
  readonly nodeId: string;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.map = new LWWMap(nodeId);
  }

  set(path: string, value: any): void {
    this.map.set(path, value);
  }

  get(path: string): any {
    return this.map.get(path);
  }

  delete(path: string): void {
    this.map.delete(path);
  }

  keys(): string[] {
    return this.map.keys();
  }

  toObject(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of this.map.entries()) {
      result[key] = value;
    }
    return result;
  }

  merge(other: JSONDoc): void {
    this.map.merge(other.map);
  }

  toJSON(): any {
    return this.map.toJSON();
  }
}

// =============================================================================
// Factory
// =============================================================================

export type CRDTType =
  | 'g-counter'
  | 'pn-counter'
  | 'g-set'
  | '2p-set'
  | 'or-set'
  | 'lww-register'
  | 'mv-register'
  | 'lww-map'
  | 'rga'
  | 'json-doc';

export function createCRDT(type: CRDTType, nodeId: string, initialValue?: any): any {
  switch (type) {
    case 'g-counter':
      return new GCounter(nodeId);
    case 'pn-counter':
      return new PNCounter(nodeId);
    case 'g-set':
      return new GSet();
    case '2p-set':
      return new TwoPSet();
    case 'or-set':
      return new ORSet(nodeId);
    case 'lww-register':
      return new LWWRegister(nodeId, initialValue ?? null);
    case 'mv-register':
      return new MVRegister(nodeId);
    case 'lww-map':
      return new LWWMap(nodeId);
    case 'rga':
      return new RGASequence(nodeId);
    case 'json-doc':
      return new JSONDoc(nodeId);
    default:
      throw new Error(`Unknown CRDT type: ${type}`);
  }
}
