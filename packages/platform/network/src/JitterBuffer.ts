/**
 * @hololand/network JitterBuffer
 *
 * Reorders out-of-sequence network state packets before interpolation.
 * Holds incoming states for a configurable hold time based on measured
 * jitter, then emits them in sequence order.
 */

import type { SyncState } from './types';

interface BufferedState {
  state: SyncState;
  insertedAt: number;
}

export class JitterBuffer {
  private readonly maxSize: number;
  /** Per-object buffers, keyed by objectId */
  private buffers: Map<string, BufferedState[]> = new Map();
  /** Last emitted sequence per object (for duplicate / stale detection) */
  private lastEmitted: Map<string, number> = new Map();

  constructor(maxSize: number = 32) {
    this.maxSize = maxSize;
  }

  /**
   * Insert a state into the jitter buffer.
   * Returns any states that are now ready to be consumed (hold time expired
   * or sequential gap resolved).
   *
   * @param state    Incoming sync state
   * @param holdTimeMs  How long to hold before emitting (derived from LatencyTracker.jitter)
   * @param now      Current timestamp (injectable for testing)
   */
  insert(state: SyncState, holdTimeMs: number, now: number = Date.now()): SyncState[] {
    const { objectId, sequence } = state;

    // Drop duplicates and stale packets
    const lastSeq = this.lastEmitted.get(objectId) ?? -1;
    if (sequence <= lastSeq) return [];

    // Get or create per-object buffer
    let buffer = this.buffers.get(objectId);
    if (!buffer) {
      buffer = [];
      this.buffers.set(objectId, buffer);
    }

    // Skip if already buffered (same objectId + sequence)
    if (buffer.some(b => b.state.sequence === sequence)) return [];

    // Insert sorted by sequence number (ascending)
    const entry: BufferedState = { state, insertedAt: now };
    let inserted = false;
    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i].state.sequence > sequence) {
        buffer.splice(i, 0, entry);
        inserted = true;
        break;
      }
    }
    if (!inserted) buffer.push(entry);

    // Evict oldest if over capacity
    while (buffer.length > this.maxSize) {
      buffer.shift();
    }

    // Emit states that are ready
    return this.flush(objectId, holdTimeMs, now);
  }

  /**
   * Flush ready states for a specific object.
   * A state is ready when:
   * 1. It's been held for at least holdTimeMs, OR
   * 2. Its sequence is the next expected one and it's been held for holdTimeMs/2, OR
   * 3. A gap has persisted for > 2x holdTime (skip the gap and emit what we have)
   */
  private flush(objectId: string, holdTimeMs: number, now: number): SyncState[] {
    const buffer = this.buffers.get(objectId);
    if (!buffer || buffer.length === 0) return [];

    const ready: SyncState[] = [];
    const expectedSeq = (this.lastEmitted.get(objectId) ?? -1) + 1;

    let i = 0;
    while (i < buffer.length) {
      const entry = buffer[i];
      const age = now - entry.insertedAt;
      const isNext = entry.state.sequence === expectedSeq + ready.length;

      if (isNext && age >= holdTimeMs * 0.5) {
        // Next in sequence and held long enough — emit
        ready.push(entry.state);
        buffer.splice(i, 1);
        // Don't increment i since we spliced
      } else if (age >= holdTimeMs) {
        // Held long enough regardless of sequence — emit
        ready.push(entry.state);
        buffer.splice(i, 1);
      } else if (age >= holdTimeMs * 2 && buffer.length >= 3) {
        // Gap persisted too long — skip gap and emit
        ready.push(entry.state);
        buffer.splice(i, 1);
      } else {
        i++;
      }
    }

    // Sort emitted by sequence and update lastEmitted
    ready.sort((a, b) => a.sequence - b.sequence);
    if (ready.length > 0) {
      const lastSeq = ready[ready.length - 1].sequence;
      const currentLast = this.lastEmitted.get(objectId) ?? -1;
      if (lastSeq > currentLast) {
        this.lastEmitted.set(objectId, lastSeq);
      }
    }

    return ready;
  }

  /**
   * Flush all objects that have states past their hold time.
   * Called each frame to drain ready states.
   */
  flushAll(holdTimeMs: number, now: number = Date.now()): SyncState[] {
    const allReady: SyncState[] = [];
    for (const objectId of this.buffers.keys()) {
      allReady.push(...this.flush(objectId, holdTimeMs, now));
    }
    return allReady;
  }

  /** Number of buffered states across all objects. */
  get totalBuffered(): number {
    let count = 0;
    for (const buffer of this.buffers.values()) {
      count += buffer.length;
    }
    return count;
  }

  /** Clear buffer for a specific object (e.g., on despawn). */
  clear(objectId: string): void {
    this.buffers.delete(objectId);
    this.lastEmitted.delete(objectId);
  }

  /** Clear all buffers. */
  clearAll(): void {
    this.buffers.clear();
    this.lastEmitted.clear();
  }
}
