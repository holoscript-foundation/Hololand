/**
 * Spatial Fleet Bridge - Safe Integration Layer
 *
 * Provides a public interface for consuming spatial fleet data in Hololand
 * WITHOUT exposing proprietary uaa2-service algorithms or internal logic.
 *
 * This is a ONE-WAY data flow: External → Hololand
 *
 * Key Principles:
 * 1. No proprietary uaa2-service code is imported or exposed
 * 2. Only standardized spatial data types are defined
 * 3. Consumers provide their own data - we just visualize it
 * 4. All interfaces are publicly documented TypeScript types
 *
 * @version 1.0.0
 * @since 2026-01-25
 */

// =============================================================================
// PUBLIC SPATIAL TYPES (Safe to expose)
// =============================================================================

/**
 * 3D Position in space
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Generic entity that can be visualized in HoloScript
 * Consumers provide their own entity data - we don't care about the source
 */
export interface SpatialEntity {
  id: string;
  name: string;
  position: Vector3;
  entityType: 'vehicle' | 'ship' | 'aircraft' | 'spaceship' | 'marker' | 'custom';
  metadata?: Record<string, unknown>;
}

/**
 * A zone or region in 3D space
 */
export interface SpatialZone {
  id: string;
  name: string;
  bounds: {
    min: Vector3;
    max: Vector3;
  };
  color?: string;
  opacity?: number;
}

/**
 * Connection between two entities (for visualization)
 */
export interface SpatialConnection {
  fromId: string;
  toId: string;
  connectionType: 'path' | 'signal' | 'dependency' | 'formation';
  color?: string;
  animated?: boolean;
}

/**
 * Fleet visualization data that can come from ANY source
 * This is the public contract - sources implement their own adapters
 */
export interface FleetVisualizationData {
  entities: SpatialEntity[];
  zones?: SpatialZone[];
  connections?: SpatialConnection[];
  metadata?: {
    source: string;
    timestamp: number;
    totalEntities: number;
    [key: string]: unknown;
  };
}

// =============================================================================
// HOLOSCRIPT GENERATION (Safe - generates code, doesn't expose logic)
// =============================================================================

/**
 * Generate HoloScript scene from fleet visualization data
 *
 * This is a PURE FUNCTION - no secrets, no algorithms, just string templating
 * The visualization logic is standard and publicly documented
 */
export function generateFleetVisualizationHoloScript(
  data: FleetVisualizationData,
  sceneName: string = 'Fleet Visualization'
): string {
  const entities = data.entities
    .map(
      (entity) => `
    object "${entity.name}" {
      position: [${entity.position.x}, ${entity.position.y}, ${entity.position.z}]
      type: "${mapEntityTypeToHoloType(entity.entityType)}"
      metadata: ${JSON.stringify(entity.metadata || {})}
    }`
    )
    .join('\n');

  const zones = (data.zones || [])
    .map(
      (zone) => `
    spatial_group "${zone.name}" {
      bounds: {
        min: [${zone.bounds.min.x}, ${zone.bounds.min.y}, ${zone.bounds.min.z}]
        max: [${zone.bounds.max.x}, ${zone.bounds.max.y}, ${zone.bounds.max.z}]
      }
      color: "${zone.color || '#00ffff'}"
      opacity: ${zone.opacity || 0.3}
    }`
    )
    .join('\n');

  const connections = (data.connections || [])
    .map(
      (conn) => `
    connect "${conn.fromId}" to "${conn.toId}" as "${conn.connectionType}" {
      color: "${conn.color || '#ffffff'}"
      animated: ${conn.animated || false}
    }`
    )
    .join('\n');

  return `
composition "${sceneName}" {
  environment {
    skybox: "space"
    ambient_light: 0.2
  }

  // Entities (${data.entities.length} total)
  ${entities}

  // Zones
  ${zones}

  // Connections
  ${connections}

  logic {
    on_entity_select(entity) {
      show_info_panel(entity.metadata)
    }
  }
}
`.trim();
}

/**
 * Map entity types to HoloScript object types
 */
function mapEntityTypeToHoloType(entityType: SpatialEntity['entityType']): string {
  const mapping: Record<string, string> = {
    vehicle: 'cube',
    ship: 'cylinder',
    aircraft: 'cone',
    spaceship: 'orb',
    marker: 'sphere',
    custom: 'cube',
  };
  return mapping[entityType] || 'cube';
}

// =============================================================================
// DATA ADAPTER INTERFACE (Consumers implement this)
// =============================================================================

/**
 * Interface for data adapters
 *
 * External systems implement this interface to provide data
 * They are responsible for NOT exposing their proprietary data
 */
export interface FleetDataAdapter {
  /**
   * Unique identifier for this adapter
   */
  readonly adapterId: string;

  /**
   * Human-readable name
   */
  readonly name: string;

  /**
   * Fetch current fleet data
   * Adapters decide what to expose
   */
  fetchData(): Promise<FleetVisualizationData>;

  /**
   * Subscribe to real-time updates (optional)
   */
  subscribe?(callback: (data: FleetVisualizationData) => void): () => void;
}

// =============================================================================
// EXAMPLE ADAPTER (Safe mock - no real data)
// =============================================================================

/**
 * Demo adapter that generates mock spatial data
 * Used for testing and examples - no real data exposed
 */
export class DemoFleetAdapter implements FleetDataAdapter {
  readonly adapterId = 'demo-fleet';
  readonly name = 'Demo Fleet Visualization';

  async fetchData(): Promise<FleetVisualizationData> {
    // Generate random demo entities
    const entities: SpatialEntity[] = Array.from({ length: 10 }, (_, i) => ({
      id: `demo_${i}`,
      name: `Demo Entity ${i}`,
      position: {
        x: Math.random() * 100 - 50,
        y: Math.random() * 50,
        z: Math.random() * 100 - 50,
      },
      entityType: ['vehicle', 'ship', 'aircraft', 'spaceship'][i % 4] as SpatialEntity['entityType'],
      metadata: { index: i, isDemo: true },
    }));

    return {
      entities,
      zones: [
        {
          id: 'demo_zone_1',
          name: 'Demo Zone',
          bounds: { min: { x: -50, y: 0, z: -50 }, max: { x: 50, y: 100, z: 50 } },
          color: '#00ff00',
          opacity: 0.2,
        },
      ],
      metadata: {
        source: 'demo',
        timestamp: Date.now(),
        totalEntities: entities.length,
      },
    };
  }
}

// =============================================================================
// BRIDGE SERVICE
// =============================================================================

/**
 * Fleet Visualization Bridge
 *
 * Manages adapters and provides unified access to fleet data
 * for HoloScript visualization
 */
export class FleetVisualizationBridge {
  private adapters: Map<string, FleetDataAdapter> = new Map();
  private subscriptions: Map<string, () => void> = new Map();

  /**
   * Register a data adapter
   */
  registerAdapter(adapter: FleetDataAdapter): void {
    this.adapters.set(adapter.adapterId, adapter);
  }

  /**
   * Unregister an adapter
   */
  unregisterAdapter(adapterId: string): void {
    const unsub = this.subscriptions.get(adapterId);
    if (unsub) {
      unsub();
      this.subscriptions.delete(adapterId);
    }
    this.adapters.delete(adapterId);
  }

  /**
   * Get visualization data from an adapter
   */
  async getVisualizationData(adapterId: string): Promise<FleetVisualizationData | null> {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) return null;
    return adapter.fetchData();
  }

  /**
   * Generate HoloScript from adapter data
   */
  async generateHoloScript(adapterId: string, sceneName?: string): Promise<string | null> {
    const data = await this.getVisualizationData(adapterId);
    if (!data) return null;
    return generateFleetVisualizationHoloScript(data, sceneName);
  }

  /**
   * List registered adapters
   */
  listAdapters(): Array<{ id: string; name: string }> {
    return Array.from(this.adapters.entries()).map(([id, adapter]) => ({
      id,
      name: adapter.name,
    }));
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let bridgeInstance: FleetVisualizationBridge | null = null;

export function getFleetVisualizationBridge(): FleetVisualizationBridge {
  if (!bridgeInstance) {
    bridgeInstance = new FleetVisualizationBridge();
    // Register demo adapter by default
    bridgeInstance.registerAdapter(new DemoFleetAdapter());
  }
  return bridgeInstance;
}
