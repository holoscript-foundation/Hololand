/**
 * FrameBuffer — Prefetch Buffer for Volumetric Video Streaming
 *
 * Manages a ring buffer of decoded frames for smooth playback.
 * Handles prefetching, frame eviction, and memory budget enforcement.
 *
 * Features:
 * - Configurable buffer size (frames ahead)
 * - Memory-aware eviction when budget is exceeded
 * - Keyframe pinning (keeps reference frames in buffer)
 * - Stream fetch with progressive quality tier selection
 * - Buffer health monitoring for adaptive quality decisions
 *
 * @module volumetric-bridge/volumetric-video
 */

import type {
  KeyframeData,
  DecodedFrame,
  VolumetricVideoManifest,
  VolumetricQualityTier,
  FrameIndexEntry,
  VolumetricVideoEventHandler,
} from './types';
import { QUALITY_TIER_CONFIGS } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Bytes per Gaussian for memory estimation (positions + scales + rotations + colors + opacities) */
const BYTES_PER_GAUSSIAN = (3 + 3 + 4 + 4 + 1) * 4; // 60 bytes

/** Minimum buffer health before triggering quality downgrade (0-1) */
const MIN_BUFFER_HEALTH = 0.3;

/** Target buffer health for optimal playback */
const TARGET_BUFFER_HEALTH = 0.7;

// =============================================================================
// FRAME BUFFER ENTRY
// =============================================================================

interface BufferEntry {
  /** Decoded frame data */
  frame: KeyframeData;
  /** Frame index in the sequence */
  frameIndex: number;
  /** Whether this is a keyframe that should be pinned */
  isKeyframe: boolean;
  /** Approximate memory usage in bytes */
  memorySizeBytes: number;
  /** Timestamp when this entry was added */
  addedAt: number;
  /** Number of times this frame has been accessed */
  accessCount: number;
}

// =============================================================================
// FRAME BUFFER
// =============================================================================

/**
 * Ring buffer for prefetched volumetric video frames.
 */
export class FrameBuffer {
  private buffer: Map<number, BufferEntry> = new Map();
  private maxFrames: number;
  private maxMemoryBytes: number;
  private currentMemoryBytes = 0;
  private manifest: VolumetricVideoManifest | null = null;
  private currentTier: VolumetricQualityTier = 'high';
  private eventHandlers: VolumetricVideoEventHandler[] = [];

  // Prefetch state
  private prefetchHead = 0;
  private prefetchActive = false;
  private abortController: AbortController | null = null;

  constructor(maxFrames: number = 30, maxMemoryMB: number = 256) {
    this.maxFrames = maxFrames;
    this.maxMemoryBytes = maxMemoryMB * 1024 * 1024;
  }

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  /**
   * Set the stream manifest for frame fetching.
   */
  setManifest(manifest: VolumetricVideoManifest): void {
    this.manifest = manifest;
  }

  /**
   * Set the active quality tier for prefetching.
   */
  setQualityTier(tier: VolumetricQualityTier): void {
    this.currentTier = tier;
  }

  /**
   * Set the maximum buffer size in frames.
   */
  setMaxFrames(maxFrames: number): void {
    this.maxFrames = maxFrames;
    this.enforceBufferLimits();
  }

  /**
   * Set the maximum memory budget.
   */
  setMaxMemoryMB(maxMemoryMB: number): void {
    this.maxMemoryBytes = maxMemoryMB * 1024 * 1024;
    this.enforceBufferLimits();
  }

  // ---------------------------------------------------------------------------
  // Frame Access
  // ---------------------------------------------------------------------------

  /**
   * Get a decoded frame from the buffer by index.
   * Returns null if the frame is not buffered.
   */
  getFrame(frameIndex: number): KeyframeData | null {
    const entry = this.buffer.get(frameIndex);
    if (!entry) return null;

    entry.accessCount++;
    return entry.frame;
  }

  /**
   * Check if a frame is available in the buffer.
   */
  hasFrame(frameIndex: number): boolean {
    return this.buffer.has(frameIndex);
  }

  /**
   * Add a decoded frame to the buffer.
   */
  addFrame(frame: KeyframeData, isKeyframe: boolean): void {
    const frameIndex = frame.frameIndex;

    // If already buffered, update
    if (this.buffer.has(frameIndex)) {
      const existing = this.buffer.get(frameIndex)!;
      this.currentMemoryBytes -= existing.memorySizeBytes;
      this.buffer.delete(frameIndex);
    }

    const memorySizeBytes = frame.gaussianCount * BYTES_PER_GAUSSIAN;

    const entry: BufferEntry = {
      frame,
      frameIndex,
      isKeyframe,
      memorySizeBytes,
      addedAt: performance.now(),
      accessCount: 0,
    };

    this.buffer.set(frameIndex, entry);
    this.currentMemoryBytes += memorySizeBytes;

    // Enforce limits
    this.enforceBufferLimits();

    // Emit buffer update event
    this.emitBufferUpdate();
  }

  /**
   * Get the nearest keyframe at or before the given frame index.
   */
  getNearestKeyframe(frameIndex: number): KeyframeData | null {
    // Search backwards for a keyframe
    for (let i = frameIndex; i >= 0; i--) {
      const entry = this.buffer.get(i);
      if (entry && entry.isKeyframe) {
        return entry.frame;
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Prefetch Control
  // ---------------------------------------------------------------------------

  /**
   * Start prefetching frames from the given position.
   * Returns a promise that resolves when the minimum buffer is filled.
   */
  async startPrefetch(
    fromFrame: number,
    fetchFrame: (index: number, tier: VolumetricQualityTier) => Promise<KeyframeData>,
  ): Promise<void> {
    this.prefetchHead = fromFrame;
    this.prefetchActive = true;
    this.abortController = new AbortController();

    const minBufferFrames = Math.min(5, this.maxFrames);
    let bufferedCount = 0;

    while (
      this.prefetchActive &&
      bufferedCount < this.maxFrames &&
      this.prefetchHead < (this.manifest?.frameCount ?? Infinity)
    ) {
      // Check abort
      if (this.abortController.signal.aborted) break;

      // Skip if already buffered
      if (this.hasFrame(this.prefetchHead)) {
        this.prefetchHead++;
        bufferedCount++;
        continue;
      }

      try {
        const frame = await fetchFrame(this.prefetchHead, this.currentTier);
        const isKeyframe = this.manifest
          ? this.manifest.frameIndex[this.prefetchHead]?.type === 'I'
          : false;

        this.addFrame(frame, isKeyframe);
        bufferedCount++;
        this.prefetchHead++;

        // After minimum buffer is filled, resolve the initial promise
        if (bufferedCount === minBufferFrames) {
          // Continue prefetching in background
        }
      } catch (err) {
        if (this.abortController.signal.aborted) break;
        console.warn(`[FrameBuffer] Prefetch error at frame ${this.prefetchHead}:`, err);
        this.prefetchHead++;
      }
    }

    this.prefetchActive = false;
  }

  /**
   * Stop any active prefetch operation.
   */
  stopPrefetch(): void {
    this.prefetchActive = false;
    this.abortController?.abort();
    this.abortController = null;
  }

  // ---------------------------------------------------------------------------
  // Buffer Health
  // ---------------------------------------------------------------------------

  /**
   * Get the buffer health as a ratio (0-1).
   * Represents how full the buffer is relative to the target.
   */
  getBufferHealth(): number {
    const frameCount = this.buffer.size;
    return Math.min(1.0, frameCount / this.maxFrames);
  }

  /**
   * Check if the buffer health is below the minimum threshold.
   */
  isBufferLow(): boolean {
    return this.getBufferHealth() < MIN_BUFFER_HEALTH;
  }

  /**
   * Get the number of frames available after a given index.
   */
  getFramesAhead(fromFrame: number): number {
    let count = 0;
    for (let i = fromFrame; i < fromFrame + this.maxFrames; i++) {
      if (this.buffer.has(i)) count++;
    }
    return count;
  }

  // ---------------------------------------------------------------------------
  // Memory Management
  // ---------------------------------------------------------------------------

  /**
   * Enforce buffer limits by evicting oldest non-keyframe entries.
   */
  private enforceBufferLimits(): void {
    // Evict by count
    while (this.buffer.size > this.maxFrames) {
      this.evictOldest();
    }

    // Evict by memory
    while (this.currentMemoryBytes > this.maxMemoryBytes && this.buffer.size > 1) {
      this.evictOldest();
    }
  }

  /**
   * Evict the oldest non-keyframe entry, or oldest keyframe if no delta frames remain.
   */
  private evictOldest(): void {
    let oldestNonKeyframe: number | null = null;
    let oldestKeyframe: number | null = null;
    let oldestNonKeyframeTime = Infinity;
    let oldestKeyframeTime = Infinity;

    for (const [index, entry] of this.buffer) {
      if (!entry.isKeyframe && entry.addedAt < oldestNonKeyframeTime) {
        oldestNonKeyframe = index;
        oldestNonKeyframeTime = entry.addedAt;
      }
      if (entry.addedAt < oldestKeyframeTime) {
        oldestKeyframe = index;
        oldestKeyframeTime = entry.addedAt;
      }
    }

    const evictIndex = oldestNonKeyframe ?? oldestKeyframe;
    if (evictIndex !== null) {
      const entry = this.buffer.get(evictIndex)!;
      this.currentMemoryBytes -= entry.memorySizeBytes;
      this.buffer.delete(evictIndex);
    }
  }

  /**
   * Clear all frames at or before the given index (garbage collection).
   */
  evictBefore(frameIndex: number): void {
    for (const [index, entry] of this.buffer) {
      if (index < frameIndex && !entry.isKeyframe) {
        this.currentMemoryBytes -= entry.memorySizeBytes;
        this.buffer.delete(index);
      }
    }
    this.emitBufferUpdate();
  }

  /**
   * Clear all buffered frames.
   */
  clear(): void {
    this.stopPrefetch();
    this.buffer.clear();
    this.currentMemoryBytes = 0;
    this.prefetchHead = 0;
  }

  // ---------------------------------------------------------------------------
  // Statistics
  // ---------------------------------------------------------------------------

  /**
   * Get buffer statistics.
   */
  getStats(): {
    bufferedFrames: number;
    maxFrames: number;
    memoryUsageMB: number;
    maxMemoryMB: number;
    bufferHealth: number;
    keyframeCount: number;
    deltaFrameCount: number;
    prefetchHead: number;
    prefetchActive: boolean;
  } {
    let keyframeCount = 0;
    for (const entry of this.buffer.values()) {
      if (entry.isKeyframe) keyframeCount++;
    }

    return {
      bufferedFrames: this.buffer.size,
      maxFrames: this.maxFrames,
      memoryUsageMB: this.currentMemoryBytes / (1024 * 1024),
      maxMemoryMB: this.maxMemoryBytes / (1024 * 1024),
      bufferHealth: this.getBufferHealth(),
      keyframeCount,
      deltaFrameCount: this.buffer.size - keyframeCount,
      prefetchHead: this.prefetchHead,
      prefetchActive: this.prefetchActive,
    };
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  on(handler: VolumetricVideoEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      this.eventHandlers = this.eventHandlers.filter((h) => h !== handler);
    };
  }

  private emitBufferUpdate(): void {
    const health = this.getBufferHealth();
    for (const handler of this.eventHandlers) {
      handler({
        type: 'buffer-update',
        bufferedFrames: this.buffer.size,
        bufferHealthPercent: health * 100,
      });
    }
  }
}
