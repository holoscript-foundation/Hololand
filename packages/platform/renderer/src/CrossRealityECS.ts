/**
 * Cross-Reality ECS — Entity-Component-System for Agent State
 *
 * W.031: ECS is the natural state model for cross-reality agents.
 * Components persist across form factors, rendering systems swap per platform.
 */

// =============================================================================
// COMPONENT TYPES (persist across handoffs)
// =============================================================================

export interface IdentityComponent { type: 'identity'; agentId: string; did: string; displayName: string; roles: string[]; }
export interface SpatialComponent { type: 'spatial'; position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number; w: number }; geospatial: { latitude: number; longitude: number; altitude: number } | null; anchorId: string | null; }
export interface TaskComponent { type: 'task'; taskId: string; description: string; progress: number; currentStep: string; resumeContext: Record<string, unknown>; }
export interface PreferencesComponent { type: 'preferences'; interactionMode: string; language: string; accessibility: { highContrast: boolean; reducedMotion: boolean; screenReader: boolean; fontScale: number; }; }
export interface EmbodimentComponent { type: 'embodiment'; currentType: string; avatarConfig: Record<string, unknown>; animationState: string; visibility: boolean; }
export interface ConversationComponent { type: 'conversation'; messages: Array<{ role: string; content: string; timestamp: number }>; turnCount: number; }
export interface NetworkComponent { type: 'network'; deviceId: string; formFactor: string; connectionState: 'connected' | 'disconnected' | 'reconnecting'; latencyMs: number; lastHeartbeat: number; }

export type ECSComponent = IdentityComponent | SpatialComponent | TaskComponent | PreferencesComponent | EmbodimentComponent | ConversationComponent | NetworkComponent;
export type ComponentType = ECSComponent['type'];

// =============================================================================
// ENTITY
// =============================================================================

export class Entity {
  readonly id: string;
  private components: Map<ComponentType, ECSComponent> = new Map();

  constructor(id: string) { this.id = id; }

  addComponent<T extends ECSComponent>(component: T): void { this.components.set(component.type, component); }
  getComponent<T extends ECSComponent>(type: T['type']): T | undefined { return this.components.get(type) as T | undefined; }
  hasComponent(type: ComponentType): boolean { return this.components.has(type); }
  removeComponent(type: ComponentType): boolean { return this.components.delete(type); }
  getAllComponents(): ECSComponent[] { return Array.from(this.components.values()); }

  serialize(): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const [type, comp] of this.components) data[type] = { ...comp };
    return data;
  }

  deserialize(data: Record<string, unknown>): void {
    for (const [type, comp] of Object.entries(data)) this.components.set(type as ComponentType, comp as ECSComponent);
  }
}

// =============================================================================
// SYSTEM INTERFACE
// =============================================================================

export interface ECSSystem {
  name: string;
  requiredComponents: ComponentType[];
  platform: string | null; // null = universal (always active)
  update(entities: Entity[], deltaTime: number): void;
  dispose(): void;
}

// =============================================================================
// WORLD
// =============================================================================

export class CrossRealityWorld {
  private entities: Map<string, Entity> = new Map();
  private systems: ECSSystem[] = [];
  private activePlatform = 'desktop';

  createEntity(id: string): Entity {
    const entity = new Entity(id);
    this.entities.set(id, entity);
    return entity;
  }

  getEntity(id: string): Entity | undefined { return this.entities.get(id); }
  removeEntity(id: string): boolean { return this.entities.delete(id); }
  getAllEntities(): Entity[] { return Array.from(this.entities.values()); }

  registerSystem(system: ECSSystem): void { this.systems.push(system); }

  unregisterSystem(name: string): void {
    const idx = this.systems.findIndex(s => s.name === name);
    if (idx >= 0) { this.systems[idx].dispose(); this.systems.splice(idx, 1); }
  }

  switchPlatform(platform: string): { activated: string[]; deactivated: string[] } {
    const old = this.activePlatform;
    this.activePlatform = platform;
    const activated: string[] = [];
    const deactivated: string[] = [];
    for (const s of this.systems) {
      if (s.platform === null) continue;
      if (s.platform === old && s.platform !== platform) deactivated.push(s.name);
      if (s.platform === platform && s.platform !== old) activated.push(s.name);
    }
    return { activated, deactivated };
  }

  update(deltaTime: number): void {
    for (const system of this.systems) {
      if (system.platform !== null && system.platform !== this.activePlatform) continue;
      const matching = this.getAllEntities().filter(e => system.requiredComponents.every(t => e.hasComponent(t)));
      if (matching.length > 0) system.update(matching, deltaTime);
    }
  }

  serializeWorld(): Record<string, Record<string, unknown>> {
    const data: Record<string, Record<string, unknown>> = {};
    for (const [id, entity] of this.entities) data[id] = entity.serialize();
    return data;
  }

  deserializeWorld(data: Record<string, Record<string, unknown>>): void {
    for (const [id, entityData] of Object.entries(data)) {
      let entity = this.entities.get(id);
      if (!entity) entity = this.createEntity(id);
      entity.deserialize(entityData);
    }
  }

  getActivePlatform(): string { return this.activePlatform; }
  getMetrics() {
    return {
      entities: this.entities.size,
      systems: this.systems.length,
      activePlatform: this.activePlatform,
      activeSystems: this.systems.filter(s => s.platform === null || s.platform === this.activePlatform).length,
    };
  }
}

export function createCrossRealityWorld(): CrossRealityWorld { return new CrossRealityWorld(); }
