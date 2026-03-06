/**
 * CulturalTraceRenderer
 *
 * Spatial visualization layer for rendering cultural traces in HoloLand VR worlds.
 *
 * This renderer reads the front buffer of the StigmergicTraceEngine at 90Hz
 * and produces visual representations of:
 *
 * 1. TRACE PARTICLES: Individual traces rendered as glowing particles whose
 *    size, color, and opacity reflect their intensity and category. Particles
 *    pulse gently to convey the "living" nature of the stigmergic field.
 *
 * 2. HEATMAP OVERLAY: A ground-plane (or volumetric) overlay showing aggregate
 *    trace intensity as a color gradient (cold blues to hot reds). This gives
 *    an at-a-glance view of where collective activity concentrates.
 *
 * 3. CLUSTER INDICATORS: Emergent hotspots detected by the CollectiveMemoryAggregator
 *    are highlighted with subtle ring/dome indicators showing cluster boundaries,
 *    centroid markers, and optional agent-count badges.
 *
 * 4. PATH PREFERENCE TRAILS: Emergent trails rendered as spline curves with
 *    animated flow particles showing the dominant traversal direction.
 *
 * RENDER-LOOP SAFETY:
 * This renderer ONLY reads from the front buffer. All expensive computations
 * (trace decay, diffusion, clustering) happen off the render loop in the
 * StigmergicTraceEngine and CollectiveMemoryAggregator. The renderer's job
 * is purely visual -- it maps data to draw calls.
 *
 * PERFORMANCE BUDGET:
 *   Front buffer read:     < 0.01ms (Map lookup)
 *   Particle culling:      < 0.5ms (frustum + distance)
 *   Particle update:       < 0.5ms (5000 max particles)
 *   Heatmap update:        < 0.3ms (texture write)
 *   Cluster indicators:    < 0.2ms (few dozen at most)
 *   Path splines:          < 0.2ms (20 max paths)
 *   TOTAL:                 < 1.7ms (well within 11.1ms VR budget)
 *
 * INTEGRATION:
 * The renderer produces abstract render commands (TraceRenderOutput) that the
 * main HololandRenderer translates to Three.js draw calls. This keeps the
 * cultural trace system framework-agnostic.
 *
 * @module CulturalTraceRenderer
 */

import { logger } from './logger';
import type { Vec3 } from './AgentStateBuffer';
import type {
  CulturalTrace,
  TraceCluster,
  PathPreference,
  CellId,
  CulturalTraceRendererConfig,
  TraceCategory,
} from './CulturalTraceTypes';
import {
  TRACE_CATEGORY_DEFAULTS,
  cellIdToPosition,
  createDefaultRendererConfig,
} from './CulturalTraceTypes';
import type { StigmergicTraceEngine } from './StigmergicTraceEngine';
import type { CollectiveMemoryAggregator } from './CollectiveMemoryAggregator';

// =============================================================================
// RENDER OUTPUT TYPES
// =============================================================================

/**
 * A single particle to be rendered in the scene.
 */
export interface TraceParticle {
  /** World-space position */
  position: Vec3;
  /** Particle size in world units */
  size: number;
  /** RGBA color (normalized 0-1) */
  color: [number, number, number, number];
  /** Glow intensity (0-1, for bloom/emissive) */
  glow: number;
  /** Animation phase (0-1, for pulsing) */
  phase: number;
  /** Source trace category (for shader selection) */
  category: TraceCategory;
  /** Agent ID that deposited this trace */
  agentId: string;
  /** Optional label text */
  label: string | null;
}

/**
 * A heatmap cell to be rendered as a colored overlay.
 */
export interface HeatmapCell {
  /** World-space position (cell center) */
  position: Vec3;
  /** Intensity (0-1, maps to color gradient) */
  intensity: number;
  /** Cell size in world units */
  size: number;
  /** RGBA color derived from intensity */
  color: [number, number, number, number];
}

/**
 * A cluster indicator to be rendered.
 */
export interface ClusterIndicator {
  /** Cluster centroid */
  position: Vec3;
  /** Cluster boundary radius */
  radius: number;
  /** Visual style based on dominant category */
  color: [number, number, number, number];
  /** Stability opacity (0-1, more stable = more visible) */
  opacity: number;
  /** Trend arrow direction (growing=up, decaying=down, stable=none) */
  trend: 'growing' | 'stable' | 'decaying';
  /** Number of unique agents */
  agentCount: number;
  /** Total trace count */
  traceCount: number;
  /** Label text */
  label: string;
}

/**
 * A path trail to be rendered as a spline with flow animation.
 */
export interface PathTrail {
  /** Ordered positions along the path */
  points: Vec3[];
  /** Path width in world units */
  width: number;
  /** RGBA color for the path line */
  color: [number, number, number, number];
  /** Flow animation speed (0-1) */
  flowSpeed: number;
  /** Dominant direction for flow particles */
  direction: Vec3;
  /** Traversal count (for label) */
  traversalCount: number;
}

/**
 * Complete render output for one frame.
 * The main renderer consumes this to produce Three.js draw calls.
 */
export interface TraceRenderOutput {
  /** Particles to render */
  particles: TraceParticle[];
  /** Heatmap cells (if enabled) */
  heatmapCells: HeatmapCell[];
  /** Cluster indicators (if enabled) */
  clusterIndicators: ClusterIndicator[];
  /** Path trails (if enabled) */
  pathTrails: PathTrail[];
  /** Frame sequence number */
  frameSequence: number;
  /** Total active traces (for HUD display) */
  totalActiveTraces: number;
  /** Total clusters (for HUD display) */
  totalClusters: number;
  /** Total paths (for HUD display) */
  totalPaths: number;
}

// =============================================================================
// CULTURAL TRACE RENDERER
// =============================================================================

export class CulturalTraceRenderer {
  private readonly config: CulturalTraceRendererConfig;
  private readonly engine: StigmergicTraceEngine;
  private readonly aggregator: CollectiveMemoryAggregator;

  /** Frame counter for animation */
  private frameCount = 0;

  /** Camera position for distance culling (updated externally) */
  private cameraPosition: Vec3 = { x: 0, y: 0, z: 0 };

  constructor(
    engine: StigmergicTraceEngine,
    aggregator: CollectiveMemoryAggregator,
    config?: Partial<CulturalTraceRendererConfig>,
  ) {
    this.config = createDefaultRendererConfig(config);
    this.engine = engine;
    this.aggregator = aggregator;

    logger.info(
      `[CulturalTraceRenderer] Initialized: particles=${this.config.showTraceParticles}, ` +
      `heatmap=${this.config.showHeatmap}, clusters=${this.config.showClusters}, ` +
      `paths=${this.config.showPathPreferences}`,
    );
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Update the camera position for distance-based culling.
   * Call this each frame before render().
   */
  setCameraPosition(position: Vec3): void {
    this.cameraPosition = position;
  }

  /**
   * Update renderer configuration at runtime.
   */
  updateConfig(overrides: Partial<CulturalTraceRendererConfig>): void {
    Object.assign(this.config, overrides);
  }

  /**
   * Produce one frame of render output.
   * This is the main method called at 90Hz on the render loop.
   *
   * PERFORMANCE: < 1.7ms total
   */
  render(): TraceRenderOutput {
    this.frameCount++;

    const output: TraceRenderOutput = {
      particles: [],
      heatmapCells: [],
      clusterIndicators: [],
      pathTrails: [],
      frameSequence: this.frameCount,
      totalActiveTraces: this.engine.getTraces().size,
      totalClusters: this.aggregator.getClusters().length,
      totalPaths: this.aggregator.getPathPreferences().length,
    };

    // Generate particles from active traces
    if (this.config.showTraceParticles) {
      output.particles = this.generateParticles();
    }

    // Generate heatmap overlay
    if (this.config.showHeatmap) {
      output.heatmapCells = this.generateHeatmap();
    }

    // Generate cluster indicators
    if (this.config.showClusters) {
      output.clusterIndicators = this.generateClusterIndicators();
    }

    // Generate path trails
    if (this.config.showPathPreferences) {
      output.pathTrails = this.generatePathTrails();
    }

    return output;
  }

  /**
   * Get renderer config (for UI binding).
   */
  getConfig(): Readonly<CulturalTraceRendererConfig> {
    return this.config;
  }

  // ===========================================================================
  // PARTICLE GENERATION
  // ===========================================================================

  /**
   * Generate particles from active traces, applying distance culling
   * and limiting to maxVisibleParticles.
   */
  private generateParticles(): TraceParticle[] {
    const traces = this.engine.getTraces();
    const maxParticles = this.config.maxVisibleParticles;
    const viewDistSq = this.config.viewDistance * this.config.viewDistance;
    const animTime = this.frameCount * 0.016 * this.config.animationSpeed; // ~60fps

    // Collect visible traces with distance
    const candidates: { trace: CulturalTrace; distSq: number }[] = [];

    for (const trace of traces.values()) {
      const dx = trace.position.x - this.cameraPosition.x;
      const dy = trace.position.y - this.cameraPosition.y;
      const dz = trace.position.z - this.cameraPosition.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq <= viewDistSq) {
        candidates.push({ trace, distSq });
      }
    }

    // Sort by intensity (strongest first) and cull to limit
    candidates.sort((a, b) => b.trace.intensity - a.trace.intensity);
    const visible = candidates.slice(0, maxParticles);

    // Generate particles
    return visible.map(({ trace }) => {
      // Animation phase: each trace pulses at a unique frequency
      const phaseOffset = (trace.depositedAt % 10000) / 10000;
      const phase = this.config.enableAnimation
        ? (Math.sin(animTime * 2 + phaseOffset * Math.PI * 2) + 1) * 0.5
        : 0.5;

      // Size varies with intensity and reinforcement
      const baseSize = this.config.particleSize;
      const size = baseSize * (0.5 + trace.intensity * 0.5) *
        (1 + Math.min(trace.reinforcementCount, 10) * 0.05);

      // Glow based on intensity
      const glow = this.config.enableGlow
        ? trace.intensity * 0.8 + phase * 0.2
        : 0;

      // Label (if enabled)
      const label = this.config.showAgentLabels ? trace.agentName : null;

      return {
        position: trace.position,
        size: size * (0.9 + phase * 0.1), // Subtle size pulsing
        color: [...trace.color] as [number, number, number, number],
        glow,
        phase,
        category: trace.category,
        agentId: trace.agentId,
        label,
      };
    });
  }

  // ===========================================================================
  // HEATMAP GENERATION
  // ===========================================================================

  /**
   * Generate heatmap cells from the collective memory heatmap.
   */
  private generateHeatmap(): HeatmapCell[] {
    const heatmap = this.aggregator.getHeatmap();
    const viewDistSq = this.config.viewDistance * this.config.viewDistance;
    const cells: HeatmapCell[] = [];
    const front = this.engine.getFrontBuffer();

    for (const [cellId, intensity] of heatmap) {
      if (intensity <= 0.01) continue;

      const cell = front.cells.get(cellId);
      const position = cell?.center ?? cellIdToPosition(cellId, 1.0);

      // Distance cull
      const dx = position.x - this.cameraPosition.x;
      const dz = position.z - this.cameraPosition.z;
      if (dx * dx + dz * dz > viewDistSq) continue;

      // Map intensity to color gradient (blue -> green -> yellow -> red)
      const color = this.intensityToColor(intensity);
      color[3] *= this.config.heatmapOpacity;

      cells.push({
        position: { x: position.x, y: position.y - 0.01, z: position.z }, // Slightly below ground
        intensity,
        size: 1.0, // Cell size (will be overridden by actual grid cellSize)
        color,
      });
    }

    return cells;
  }

  /**
   * Map intensity (0-1) to a heatmap color gradient.
   * 0.0 = deep blue, 0.25 = cyan, 0.5 = green, 0.75 = yellow, 1.0 = red
   */
  private intensityToColor(intensity: number): [number, number, number, number] {
    const t = Math.max(0, Math.min(1, intensity));

    let r: number, g: number, b: number;

    if (t < 0.25) {
      const s = t / 0.25;
      r = 0;
      g = s;
      b = 1;
    } else if (t < 0.5) {
      const s = (t - 0.25) / 0.25;
      r = 0;
      g = 1;
      b = 1 - s;
    } else if (t < 0.75) {
      const s = (t - 0.5) / 0.25;
      r = s;
      g = 1;
      b = 0;
    } else {
      const s = (t - 0.75) / 0.25;
      r = 1;
      g = 1 - s;
      b = 0;
    }

    return [r, g, b, t * 0.8 + 0.2];
  }

  // ===========================================================================
  // CLUSTER INDICATOR GENERATION
  // ===========================================================================

  /**
   * Generate visual indicators for detected clusters.
   */
  private generateClusterIndicators(): ClusterIndicator[] {
    const clusters = this.aggregator.getClusters();
    const scale = this.config.clusterIndicatorScale;

    return clusters.map((cluster) => {
      const catDefaults = TRACE_CATEGORY_DEFAULTS[cluster.dominantCategory];
      const opacity = 0.3 + cluster.stability * 0.5;

      return {
        position: cluster.centroid,
        radius: cluster.radius * scale,
        color: [...catDefaults.color] as [number, number, number, number],
        opacity,
        trend: cluster.trend,
        agentCount: cluster.uniqueAgentCount,
        traceCount: cluster.traceCount,
        label: `${cluster.dominantCategory} (${cluster.uniqueAgentCount} agents)`,
      };
    });
  }

  // ===========================================================================
  // PATH TRAIL GENERATION
  // ===========================================================================

  /**
   * Generate visual trails for detected path preferences.
   */
  private generatePathTrails(): PathTrail[] {
    const paths = this.aggregator.getPathPreferences();

    return paths.map((path) => {
      // Path width scales with traversal count
      const width = 0.05 + Math.min(path.traversalCount, 100) * 0.002;

      // Color based on intensity (brighter = more traversed)
      const t = Math.min(path.averageIntensity, 1.0);
      const color: [number, number, number, number] = [
        0.3 + t * 0.4,   // R: warm up with intensity
        0.6 + t * 0.2,   // G: bright green base
        1.0 - t * 0.3,   // B: reduce blue with intensity
        0.3 + t * 0.4,   // A: more visible with intensity
      ];

      // Flow speed based on traversal density
      const flowSpeed = Math.min(path.traversalCount / 50, 1.0);

      return {
        points: path.positions,
        width,
        color,
        flowSpeed,
        direction: path.dominantDirection,
        traversalCount: path.traversalCount,
      };
    });
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a new CulturalTraceRenderer.
 */
export function createCulturalTraceRenderer(
  engine: StigmergicTraceEngine,
  aggregator: CollectiveMemoryAggregator,
  config?: Partial<CulturalTraceRendererConfig>,
): CulturalTraceRenderer {
  return new CulturalTraceRenderer(engine, aggregator, config);
}
