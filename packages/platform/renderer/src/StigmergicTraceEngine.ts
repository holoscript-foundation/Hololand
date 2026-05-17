/**
 * StigmergicTraceEngine
 *
 * Core engine implementing digital stigmergy for HoloLand VR worlds.
 *
 * This engine manages the lifecycle of cultural traces through four fundamental
 * stigmergic operations, each inspired by biological pheromone systems:
 *
 * 1. DEPOSIT: Accept trace deposit requests and place them in the spatial grid.
 *    Analogous to an ant laying down pheromone at its current position.
 *
 * 2. DECAY (Evaporation): Reduce trace intensity over time following exponential
 *    decay: I(t) = I_0 * e^(-lambda * dt), where lambda is the per-trace decay
 *    rate scaled by the global decay multiplier. This prevents information
 *    saturation and ensures relevance of the collective memory.
 *
 * 3. REINFORCEMENT: When a new deposit overlaps an existing trace of the same
 *    category in the same cell, the existing trace's intensity is boosted rather
 *    than creating a duplicate. This is positive feedback -- frequently visited
 *    locations become progressively more prominent.
 *
 * 4. DIFFUSION: Trace intensity spreads to neighboring cells following a discrete
 *    Gaussian diffusion: delta_I_neighbor += rate * I_source * kernel_weight.
 *    This creates spatial gradients that agents can follow (gradient ascent),
 *    analogous to chemotaxis.
 *
 * EXECUTION MODEL:
 * The engine runs on a configurable Hz loop (default 5Hz), completely decoupled
 * from the 90Hz VR render loop. State is double-buffered:
 * - Back buffer: Written by the engine during update cycles
 * - Front buffer: Read by the renderer at 90Hz (< 0.01ms, safe for VR)
 * - Swap: After each engine cycle, buffers swap atomically
 *
 * CULLING:
 * Traces whose intensity drops below `cullThreshold` are removed to prevent
 * unbounded memory growth. Additionally, if total trace count exceeds
 * `maxTotalTraces`, the weakest traces are culled first.
 *
 * @module StigmergicTraceEngine
 */

import { logger } from './logger';
import type {
  CulturalTrace,
  TraceId,
  CellId,
  SpatialCell,
  TraceDepositRequest,
  StigmergicTraceEngineConfig,
  CulturalTraceWorldState,
  TraceCategory,
  CulturalTraceEventType,
  CulturalTraceEventHandler,
  CulturalTraceEventMap,
} from './CulturalTraceTypes';
import {
  TRACE_CATEGORY_DEFAULTS,
  positionToCellId,
  cellIdToPosition,
  getNeighborCellIds,
  generateTraceId,
  createEmptyCulturalTraceWorldState,
  createDefaultEngineConfig,
} from './CulturalTraceTypes';

// =============================================================================
// ENGINE STATE
// =============================================================================

/**
 * Internal engine state, separate from the double-buffered world state.
 */
interface EngineInternalState {
  /** Pending deposit requests (queued between cycles) */
  depositQueue: TraceDepositRequest[];
  /** Timer ID for the update loop */
  timerId: ReturnType<typeof setInterval> | null;
  /** Cycle count since start */
  cycleCount: number;
  /** Total deposits processed */
  totalDeposits: number;
  /** Total traces culled */
  totalTracesCulled: number;
  /** Total reinforcements */
  totalReinforcements: number;
  /** Average cycle time (EWMA, ms) */
  averageCycleMs: number;
  /** All unique agent IDs seen */
  uniqueAgents: Set<string>;
  /** Traces by category count */
  tracesByCategory: Record<TraceCategory, number>;
}

// =============================================================================
// STIGMERGIC TRACE ENGINE
// =============================================================================

export class StigmergicTraceEngine {
  private readonly config: StigmergicTraceEngineConfig;

  /** Double buffer: index 0 or 1 is the front, the other is back */
  private buffers: [CulturalTraceWorldState, CulturalTraceWorldState];
  private frontIndex: 0 | 1 = 0;

  /** Internal mutable state */
  private state: EngineInternalState;

  /** Event listeners */
  private listeners: Map<CulturalTraceEventType, Set<CulturalTraceEventHandler<CulturalTraceEventType>>>;

  constructor(config: Partial<StigmergicTraceEngineConfig> & { worldId: string }) {
    this.config = createDefaultEngineConfig(config.worldId, config);
    this.buffers = [
      createEmptyCulturalTraceWorldState(),
      createEmptyCulturalTraceWorldState(),
    ];
    this.state = {
      depositQueue: [],
      timerId: null,
      cycleCount: 0,
      totalDeposits: 0,
      totalTracesCulled: 0,
      totalReinforcements: 0,
      averageCycleMs: 0,
      uniqueAgents: new Set(),
      tracesByCategory: {
        visit: 0, inspect: 0, annotate: 0, create: 0,
        interact: 0, emotional: 0, waypoint: 0, hazard: 0,
      },
    };
    this.listeners = new Map();

    logger.info(
      `[StigmergicTraceEngine] Initialized for world "${config.worldId}" ` +
      `at ${this.config.updateHz}Hz, grid cell=${this.config.grid.cellSize}u`,
    );
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Start the engine update loop.
   */
  start(): void {
    if (this.state.timerId !== null) {
      logger.warn('[StigmergicTraceEngine] Already running, ignoring start()');
      return;
    }

    const intervalMs = Math.round(1000 / this.config.updateHz);
    this.state.timerId = setInterval(() => this.cycle(), intervalMs);

    logger.info(
      `[StigmergicTraceEngine] Started update loop at ${this.config.updateHz}Hz ` +
      `(${intervalMs}ms interval)`,
    );
  }

  /**
   * Stop the engine update loop.
   */
  stop(): void {
    if (this.state.timerId === null) {
      logger.warn('[StigmergicTraceEngine] Not running, ignoring stop()');
      return;
    }

    clearInterval(this.state.timerId);
    this.state.timerId = null;

    logger.info('[StigmergicTraceEngine] Stopped update loop');
  }

  /**
   * Whether the engine is currently running.
   */
  isRunning(): boolean {
    return this.state.timerId !== null;
  }

  /**
   * Queue a trace deposit request. Thread-safe (just pushes to array).
   * Deposits are processed on the next engine cycle.
   */
  deposit(request: TraceDepositRequest): void {
    this.state.depositQueue.push(request);
  }

  /**
   * Read the front buffer (render-loop safe, < 0.01ms).
   * The renderer calls this at 90Hz to get the latest trace state.
   */
  getFrontBuffer(): Readonly<CulturalTraceWorldState> {
    return this.buffers[this.frontIndex];
  }

  /**
   * Get a read-only reference to all active traces.
   */
  getTraces(): ReadonlyMap<TraceId, CulturalTrace> {
    return this.getFrontBuffer().traces;
  }

  /**
   * Get a read-only reference to all spatial cells.
   */
  getCells(): ReadonlyMap<CellId, SpatialCell> {
    return this.getFrontBuffer().cells;
  }

  /**
   * Get a specific trace by ID from the front buffer.
   */
  getTrace(traceId: TraceId): CulturalTrace | undefined {
    return this.getFrontBuffer().traces.get(traceId);
  }

  /**
   * Get a specific cell by ID from the front buffer.
   */
  getCell(cellId: CellId): SpatialCell | undefined {
    return this.getFrontBuffer().cells.get(cellId);
  }

  /**
   * Get traces near a world-space position within a given radius.
   */
  getTracesNear(position: { x: number; y: number; z: number }, radius: number): CulturalTrace[] {
    const results: CulturalTrace[] = [];
    const radiusSq = radius * radius;
    for (const trace of this.getFrontBuffer().traces.values()) {
      const dx = trace.position.x - position.x;
      const dy = trace.position.y - position.y;
      const dz = trace.position.z - position.z;
      if (dx * dx + dy * dy + dz * dz <= radiusSq) {
        results.push(trace);
      }
    }
    return results;
  }

  /**
   * Get engine metrics.
   */
  getMetrics(): {
    isRunning: boolean;
    cycleCount: number;
    totalDeposits: number;
    totalTracesCulled: number;
    totalReinforcements: number;
    totalActiveTraces: number;
    totalCells: number;
    uniqueAgents: number;
    averageCycleMs: number;
    tracesByCategory: Record<TraceCategory, number>;
  } {
    const front = this.getFrontBuffer();
    return {
      isRunning: this.isRunning(),
      cycleCount: this.state.cycleCount,
      totalDeposits: this.state.totalDeposits,
      totalTracesCulled: this.state.totalTracesCulled,
      totalReinforcements: this.state.totalReinforcements,
      totalActiveTraces: front.traces.size,
      totalCells: front.cells.size,
      uniqueAgents: this.state.uniqueAgents.size,
      averageCycleMs: this.state.averageCycleMs,
      tracesByCategory: { ...this.state.tracesByCategory },
    };
  }

  /**
   * Subscribe to engine events.
   */
  on<T extends CulturalTraceEventType>(
    event: T,
    handler: CulturalTraceEventHandler<T>,
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as CulturalTraceEventHandler<CulturalTraceEventType>);
  }

  /**
   * Unsubscribe from engine events.
   */
  off<T extends CulturalTraceEventType>(
    event: T,
    handler: CulturalTraceEventHandler<T>,
  ): void {
    this.listeners.get(event)?.delete(handler as CulturalTraceEventHandler<CulturalTraceEventType>);
  }

  /**
   * Destroy the engine, stopping the loop and clearing all state.
   */
  destroy(): void {
    this.stop();
    this.buffers = [
      createEmptyCulturalTraceWorldState(),
      createEmptyCulturalTraceWorldState(),
    ];
    this.state.depositQueue = [];
    this.listeners.clear();
    logger.info('[StigmergicTraceEngine] Destroyed');
  }

  // ===========================================================================
  // CORE ENGINE CYCLE
  // ===========================================================================

  /**
   * Execute one complete engine cycle: deposit -> decay -> diffusion -> cull -> swap.
   * This is the heart of the stigmergic simulation.
   */
  private cycle(): void {
    const cycleStart = performance.now();

    // Work on the back buffer
    const backIndex = this.frontIndex === 0 ? 1 : 0;
    const back = this.buffers[backIndex];

    // Copy front buffer state to back buffer for modification
    this.copyState(this.buffers[this.frontIndex], back);

    // Phase 1: Process deposit queue
    this.processDeposits(back);

    // Phase 2: Apply decay (evaporation)
    if (this.config.enableDecay) {
      this.applyDecay(back);
    }

    // Phase 3: Apply diffusion
    if (this.config.enableDiffusion) {
      this.applyDiffusion(back);
    }

    // Phase 4: Cull dead traces
    this.cullDeadTraces(back);

    // Phase 5: Update cell aggregates
    this.updateCellAggregates(back);

    // Update sequence and timestamp
    back.sequence = this.buffers[this.frontIndex].sequence + 1;
    back.lastUpdateTimestamp = Date.now();

    // Swap buffers (atomic pointer swap)
    this.frontIndex = backIndex as 0 | 1;

    // Update metrics
    this.state.cycleCount++;
    const cycleMs = performance.now() - cycleStart;
    const ewmaAlpha = 0.3;
    this.state.averageCycleMs =
      this.state.averageCycleMs * (1 - ewmaAlpha) + cycleMs * ewmaAlpha;

    if (this.state.cycleCount % 100 === 0) {
      logger.debug(
        `[StigmergicTraceEngine] Cycle ${this.state.cycleCount}: ` +
        `${back.traces.size} traces, ${back.cells.size} cells, ` +
        `${cycleMs.toFixed(2)}ms`,
      );
    }
  }

  // ===========================================================================
  // PHASE 1: DEPOSIT
  // ===========================================================================

  /**
   * Process all queued deposit requests.
   */
  private processDeposits(state: CulturalTraceWorldState): void {
    const queue = this.state.depositQueue.splice(0);
    if (queue.length === 0) return;

    for (const request of queue) {
      this.processOneDeposit(request, state);
    }
  }

  /**
   * Process a single deposit request.
   * If an overlapping trace of the same category exists in the cell, reinforce it.
   * Otherwise, create a new trace.
   */
  private processOneDeposit(
    request: TraceDepositRequest,
    state: CulturalTraceWorldState,
  ): void {
    const cellId = positionToCellId(request.position, this.config.grid.cellSize);
    const categoryDefaults = TRACE_CATEGORY_DEFAULTS[request.category];

    // Track unique agents
    this.state.uniqueAgents.add(request.agentId);

    // Check for reinforcement opportunity
    if (this.config.enableReinforcement) {
      const cell = state.cells.get(cellId);
      if (cell) {
        const existing = cell.traces.find(
          (t) => t.category === request.category && t.agentId === request.agentId,
        );
        if (existing) {
          this.reinforceTrace(existing, request);
          return;
        }
      }
    }

    // Create new trace
    const traceId = generateTraceId(request.worldId, request.agentId);
    const now = Date.now();

    const trace: CulturalTrace = {
      id: traceId,
      worldId: request.worldId,
      agentId: request.agentId,
      agentName: request.agentName,
      position: { ...request.position },
      cellId,
      category: request.category,
      intensity: request.intensity ?? categoryDefaults.intensity,
      initialIntensity: request.intensity ?? categoryDefaults.intensity,
      decayRate: request.decayRate ?? categoryDefaults.decayRate,
      diffusionRate: request.diffusionRate ?? categoryDefaults.diffusionRate,
      reinforcementCount: 0,
      depositedAt: now,
      lastReinforcedAt: now,
      lastDecayAt: now,
      color: request.color ?? [...categoryDefaults.color],
      visualRadius: 0.1 + (request.intensity ?? categoryDefaults.intensity) * 0.2,
      metadata: request.metadata ?? {},
      tags: request.tags ?? [],
      textContent: request.textContent ?? '',
      normProvenance: request.normProvenance ? { ...request.normProvenance } : undefined,
    };

    // Add to traces map
    state.traces.set(traceId, trace);

    // Add to spatial cell
    this.addTraceToCell(state, trace);

    // Update category count
    this.state.tracesByCategory[request.category]++;
    this.state.totalDeposits++;

    // Emit event
    this.emit('trace:deposited', { trace, source: 'local' });
  }

  /**
   * Reinforce an existing trace with a new overlapping deposit.
   */
  private reinforceTrace(trace: CulturalTrace, request: TraceDepositRequest): void {
    const previousIntensity = trace.intensity;
    const boost = this.config.reinforcementBoost;
    trace.intensity = Math.min(
      trace.intensity + boost,
      this.config.maxReinforcedIntensity,
    );
    trace.reinforcementCount++;
    trace.lastReinforcedAt = Date.now();

    // Grow visual radius slightly with reinforcement (capped)
    trace.visualRadius = Math.min(
      0.1 + trace.intensity * 0.2 + trace.reinforcementCount * 0.02,
      1.0,
    );

    // Merge metadata
    if (request.metadata) {
      Object.assign(trace.metadata, request.metadata);
    }
    if (request.tags) {
      for (const tag of request.tags) {
        if (!trace.tags.includes(tag)) {
          trace.tags.push(tag);
        }
      }
    }

    this.state.totalReinforcements++;

    this.emit('trace:reinforced', {
      trace,
      reinforcementCount: trace.reinforcementCount,
      previousIntensity,
    });
  }

  // ===========================================================================
  // PHASE 2: DECAY (EVAPORATION)
  // ===========================================================================

  /**
   * Apply exponential decay to all traces.
   *
   * I(t + dt) = I(t) * e^(-lambda * dt)
   *
   * Where lambda = trace.decayRate * config.globalDecayMultiplier
   */
  private applyDecay(state: CulturalTraceWorldState): void {
    const now = Date.now();
    const globalMult = this.config.globalDecayMultiplier;

    for (const trace of state.traces.values()) {
      const dtSeconds = (now - trace.lastDecayAt) / 1000;
      if (dtSeconds <= 0) continue;

      const lambda = trace.decayRate * globalMult;
      trace.intensity *= Math.exp(-lambda * dtSeconds);
      trace.lastDecayAt = now;

      // Reduce alpha channel proportionally to intensity
      trace.color[3] = trace.intensity * (TRACE_CATEGORY_DEFAULTS[trace.category].color[3]);
    }
  }

  // ===========================================================================
  // PHASE 3: DIFFUSION
  // ===========================================================================

  /**
   * Apply spatial diffusion -- trace intensity spreads to neighboring cells.
   *
   * For each trace with diffusionRate > 0:
   *   For each neighbor cell within diffusionKernelRadius:
   *     neighborIntensity += trace.intensity * diffusionRate * kernelWeight * dt
   *
   * kernelWeight decreases with distance (Gaussian falloff).
   */
  private applyDiffusion(state: CulturalTraceWorldState): void {
    const globalMult = this.config.globalDiffusionMultiplier;
    const radius = this.config.diffusionKernelRadius;

    // Collect diffusion contributions (cell -> intensity delta)
    const diffusionDeltas: Map<CellId, { intensity: number; category: TraceCategory; agentId: string; color: [number, number, number, number] }> = new Map();

    for (const trace of state.traces.values()) {
      const effectiveRate = trace.diffusionRate * globalMult;
      if (effectiveRate <= 0) continue;
      if (trace.intensity < this.config.cullThreshold * 2) continue;

      const neighbors = getNeighborCellIds(trace.cellId, radius);
      for (const neighborId of neighbors) {
        // Gaussian kernel weight based on cell distance
        const parts = neighborId.split(':');
        const traceParts = trace.cellId.split(':');
        const dx = parseInt(parts[0], 10) - parseInt(traceParts[0], 10);
        const dy = parseInt(parts[1], 10) - parseInt(traceParts[1], 10);
        const dz = parseInt(parts[2], 10) - parseInt(traceParts[2], 10);
        const distSq = dx * dx + dy * dy + dz * dz;
        const kernelWeight = Math.exp(-distSq / (2 * radius * radius));

        const contribution = trace.intensity * effectiveRate * kernelWeight * 0.01;
        if (contribution < 0.001) continue;

        const existing = diffusionDeltas.get(neighborId);
        if (existing) {
          existing.intensity += contribution;
        } else {
          diffusionDeltas.set(neighborId, {
            intensity: contribution,
            category: trace.category,
            agentId: trace.agentId,
            color: [...trace.color],
          });
        }
      }
    }

    // Apply diffusion as low-intensity ephemeral "ghost" traces
    // (only if the cell doesn't already have strong traces)
    for (const [cellId, delta] of diffusionDeltas) {
      const cell = state.cells.get(cellId);
      if (cell && cell.aggregateIntensity > 0.5) continue; // Don't diffuse into already-strong cells

      // Create or update a diffusion ghost trace in this cell
      const ghostId = `diffusion:${cellId}:${delta.category}`;
      const existing = state.traces.get(ghostId);
      if (existing) {
        existing.intensity = Math.min(existing.intensity + delta.intensity, 0.3);
        existing.lastDecayAt = Date.now();
      } else if (delta.intensity > this.config.cullThreshold) {
        const ghostTrace: CulturalTrace = {
          id: ghostId,
          worldId: this.config.worldId,
          agentId: delta.agentId,
          agentName: 'diffusion',
          position: cellIdToPosition(cellId, this.config.grid.cellSize),
          cellId,
          category: delta.category,
          intensity: Math.min(delta.intensity, 0.3),
          initialIntensity: delta.intensity,
          decayRate: TRACE_CATEGORY_DEFAULTS[delta.category].decayRate * 3, // Ghost traces decay faster
          diffusionRate: 0, // Ghost traces don't diffuse further (prevents cascade)
          reinforcementCount: 0,
          depositedAt: Date.now(),
          lastReinforcedAt: Date.now(),
          lastDecayAt: Date.now(),
          color: [delta.color[0], delta.color[1], delta.color[2], delta.intensity * 0.3],
          visualRadius: 0.05,
          metadata: { ghost: true },
          tags: ['diffusion'],
          textContent: '',
          normProvenance: {
            originInteractionId: `diffusion:${cellId}:${Date.now()}`,
            originatingAgent: delta.agentId,
            confidenceClassification: 'confabulated',
          },
        };
        state.traces.set(ghostId, ghostTrace);
        this.addTraceToCell(state, ghostTrace);
      }
    }
  }

  // ===========================================================================
  // PHASE 4: CULL DEAD TRACES
  // ===========================================================================

  /**
   * Remove traces below the cull threshold and enforce max trace count.
   */
  private cullDeadTraces(state: CulturalTraceWorldState): void {
    const threshold = this.config.cullThreshold;
    const toCull: TraceId[] = [];

    // Find traces below threshold
    for (const [traceId, trace] of state.traces) {
      if (trace.intensity < threshold) {
        toCull.push(traceId);
      }
    }

    // Cull them
    for (const traceId of toCull) {
      this.removeTrace(state, traceId, 'decay');
    }

    // If still over capacity, cull weakest
    if (state.traces.size > this.config.maxTotalTraces) {
      const sorted = Array.from(state.traces.values()).sort(
        (a, b) => a.intensity - b.intensity,
      );
      const excess = state.traces.size - this.config.maxTotalTraces;
      for (let i = 0; i < excess; i++) {
        this.removeTrace(state, sorted[i].id, 'overflow');
      }
    }
  }

  // ===========================================================================
  // PHASE 5: UPDATE CELL AGGREGATES
  // ===========================================================================

  /**
   * Recompute aggregate values for each spatial cell.
   */
  private updateCellAggregates(state: CulturalTraceWorldState): void {
    for (const cell of state.cells.values()) {
      if (cell.traces.length === 0) {
        cell.aggregateIntensity = 0;
        cell.dominantCategory = null;
        cell.uniqueAgentCount = 0;
        continue;
      }

      let totalIntensity = 0;
      const categoryCounts: Partial<Record<TraceCategory, number>> = {};
      cell.agentIds.clear();

      for (const trace of cell.traces) {
        totalIntensity += trace.intensity;
        categoryCounts[trace.category] = (categoryCounts[trace.category] ?? 0) + 1;
        cell.agentIds.add(trace.agentId);
      }

      cell.aggregateIntensity = Math.min(totalIntensity, 1.0);
      cell.uniqueAgentCount = cell.agentIds.size;

      // Find dominant category
      let maxCount = 0;
      let dominant: TraceCategory | null = null;
      for (const [cat, count] of Object.entries(categoryCounts)) {
        if (count > maxCount) {
          maxCount = count;
          dominant = cat as TraceCategory;
        }
      }
      cell.dominantCategory = dominant;
    }

    // Clean empty cells
    for (const [cellId, cell] of state.cells) {
      if (cell.traces.length === 0) {
        state.cells.delete(cellId);
      }
    }
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  /**
   * Add a trace to its spatial cell, creating the cell if needed.
   */
  private addTraceToCell(state: CulturalTraceWorldState, trace: CulturalTrace): void {
    let cell = state.cells.get(trace.cellId);
    if (!cell) {
      cell = {
        id: trace.cellId,
        center: cellIdToPosition(trace.cellId, this.config.grid.cellSize),
        traces: [],
        aggregateIntensity: 0,
        dominantCategory: null,
        uniqueAgentCount: 0,
        agentIds: new Set(),
        lastActivityAt: Date.now(),
      };
      state.cells.set(trace.cellId, cell);
    }

    // Enforce per-cell max
    if (cell.traces.length >= this.config.grid.maxTracesPerCell) {
      // Remove weakest trace in cell
      let weakest = cell.traces[0];
      for (const t of cell.traces) {
        if (t.intensity < weakest.intensity) weakest = t;
      }
      this.removeTraceFromCell(state, cell, weakest.id);
      state.traces.delete(weakest.id);
      this.state.totalTracesCulled++;
    }

    cell.traces.push(trace);
    cell.agentIds.add(trace.agentId);
    cell.lastActivityAt = Date.now();
  }

  /**
   * Remove a trace from the world state.
   */
  private removeTrace(
    state: CulturalTraceWorldState,
    traceId: TraceId,
    reason: 'decay' | 'overflow',
  ): void {
    const trace = state.traces.get(traceId);
    if (!trace) return;

    // Remove from cell
    const cell = state.cells.get(trace.cellId);
    if (cell) {
      this.removeTraceFromCell(state, cell, traceId);
    }

    // Remove from traces map
    state.traces.delete(traceId);
    this.state.totalTracesCulled++;

    // Update category count
    if (this.state.tracesByCategory[trace.category] > 0) {
      this.state.tracesByCategory[trace.category]--;
    }

    // Emit event
    this.emit('trace:culled', { traceId, reason });

    // Callback
    this.config.onTraceCulled?.(traceId);
  }

  /**
   * Remove a trace from a spatial cell's trace array.
   */
  private removeTraceFromCell(
    _state: CulturalTraceWorldState,
    cell: SpatialCell,
    traceId: TraceId,
  ): void {
    const idx = cell.traces.findIndex((t) => t.id === traceId);
    if (idx !== -1) {
      cell.traces.splice(idx, 1);
    }
  }

  /**
   * Deep copy world state from source to destination.
   * Traces and cells are cloned to prevent mutation of the front buffer.
   */
  private copyState(
    source: CulturalTraceWorldState,
    dest: CulturalTraceWorldState,
  ): void {
    dest.traces.clear();
    dest.cells.clear();

    // Clone traces
    for (const [id, trace] of source.traces) {
      dest.traces.set(id, {
        ...trace,
        position: { ...trace.position },
        color: [...trace.color],
        metadata: { ...trace.metadata },
        tags: [...trace.tags],
        normProvenance: trace.normProvenance ? { ...trace.normProvenance } : undefined,
      });
    }

    // Clone cells (reference the new trace objects)
    for (const [id, cell] of source.cells) {
      const newTraces: CulturalTrace[] = [];
      for (const trace of cell.traces) {
        const newTrace = dest.traces.get(trace.id);
        if (newTrace) newTraces.push(newTrace);
      }
      dest.cells.set(id, {
        ...cell,
        center: { ...cell.center },
        traces: newTraces,
        agentIds: new Set(cell.agentIds),
      });
    }

    dest.sequence = source.sequence;
    dest.lastUpdateTimestamp = source.lastUpdateTimestamp;
    dest.collectiveMemory = source.collectiveMemory; // Shallow ref is fine (updated by aggregator)
  }

  /**
   * Emit an event to all registered listeners.
   */
  private emit<T extends CulturalTraceEventType>(
    event: T,
    data: Parameters<CulturalTraceEventHandler<T>>[0],
  ): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        (handler as CulturalTraceEventHandler<T>)(data as CulturalTraceEventMap[T]);
      } catch (err) {
        logger.error(`[StigmergicTraceEngine] Event handler error for "${event}"`, { error: err });
      }
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a new StigmergicTraceEngine with default configuration.
 */
export function createStigmergicTraceEngine(
  config: Partial<StigmergicTraceEngineConfig> & { worldId: string },
): StigmergicTraceEngine {
  return new StigmergicTraceEngine(config);
}
