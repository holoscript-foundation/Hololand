/**
 * HoloScript Bindings for AR Tracking
 * 
 * Exposes multi-user tracking capabilities to HoloScript programs.
 * 
 * Example HoloScript usage:
 * ```holoscript
 * world "coffee-shop-ar" {
 *   tracking {
 *     mode: "multi-user"
 *     anchor: qr("shop-anchor-001")
 *     
 *     on personDetected(person) {
 *       spawn defaultAvatar at person.position
 *     }
 *     
 *     on personIdentified(person, userId) {
 *       bind character(userId) to person
 *     }
 *   }
 * }
 * ```
 */

import type {
  TrackedPerson,
  Vector3,
  Skeleton,
  TrackingConfig,
} from '../types';

// =============================================================================
// HOLOSCRIPT AST NODES FOR TRACKING
// =============================================================================

/** Tracking block in HoloScript */
export interface TrackingBlock {
  type: 'tracking';
  mode: 'single-user' | 'multi-user';
  anchor?: AnchorSpec;
  handlers: TrackingHandler[];
  config?: Partial<TrackingConfig>;
}

/** Anchor specification */
export interface AnchorSpec {
  type: 'qr' | 'apriltag' | 'vps' | 'gps' | 'manual';
  id: string;
  /** Optional fallback anchor */
  fallback?: AnchorSpec;
}

/** Event handler for tracking events */
export interface TrackingHandler {
  event: TrackingEventType;
  /** Parameter name for the person object */
  personParam: string;
  /** Additional parameters (e.g., userId for personIdentified) */
  additionalParams?: string[];
  /** Handler body (HoloScript statements) */
  body: TrackingStatement[];
}

export type TrackingEventType =
  | 'personDetected'
  | 'personLost'
  | 'personIdentified'
  | 'personMoved'
  | 'trackingStarted'
  | 'trackingStopped';

/** Statements that can appear in tracking handlers */
export type TrackingStatement =
  | SpawnStatement
  | BindStatement
  | DespawnStatement
  | TriggerStatement
  | CallStatement;

export interface SpawnStatement {
  type: 'spawn';
  what: 'avatar' | 'effect' | 'label' | string;
  characterRef?: string;
  position: PositionRef;
  properties?: Record<string, unknown>;
}

export interface BindStatement {
  type: 'bind';
  characterRef: string;
  personRef: string;
}

export interface DespawnStatement {
  type: 'despawn';
  characterRef: string;
}

export interface TriggerStatement {
  type: 'trigger';
  event: string;
  data?: Record<string, unknown>;
}

export interface CallStatement {
  type: 'call';
  function: string;
  args: unknown[];
}

export type PositionRef =
  | { type: 'person'; personRef: string }
  | { type: 'offset'; personRef: string; offset: Vector3 }
  | { type: 'absolute'; position: Vector3 };

// =============================================================================
// HOLOSCRIPT TRACKING CONTEXT
// =============================================================================

/**
 * Runtime context for tracking in HoloScript
 */
export interface TrackingContext {
  /** All tracked persons (updated each frame) */
  persons: Map<string, TrackedPersonProxy>;
  /** User → Person bindings */
  userBindings: Map<string, string>;
  /** Active characters in scene */
  characters: Map<string, CharacterInstance>;
  /** Is tracking active */
  isActive: boolean;
  /** Current anchor */
  currentAnchor: AnchorSpec | null;
}

/**
 * Proxy object for tracked person in HoloScript
 * Provides convenient accessors for scripts
 */
export interface TrackedPersonProxy {
  /** Global stable ID */
  id: string;
  /** Current position in world space */
  position: Vector3;
  /** Current velocity */
  velocity: Vector3;
  /** Bound user ID (if any) */
  userId?: string;
  /** Bound character ID (if any) */
  characterId?: string;
  /** Skeleton keypoints (if available) */
  skeleton?: Skeleton;
  /** Track confidence [0-1] */
  confidence: number;
  /** Is this person currently visible */
  isVisible: boolean;
  /** Time since person was last seen (seconds) */
  timeSinceLastSeen: number;
  
  // Convenience methods
  /** Get head position (from skeleton or estimated) */
  getHeadPosition(): Vector3;
  /** Get hand positions (from skeleton or null) */
  getHandPositions(): { left?: Vector3; right?: Vector3 };
  /** Distance to another position */
  distanceTo(position: Vector3): number;
  /** Is person facing a direction (within angle threshold) */
  isFacing(position: Vector3, thresholdDegrees?: number): boolean;
}

/**
 * Character instance in scene
 */
export interface CharacterInstance {
  id: string;
  type: 'avatar' | 'npc' | 'effect';
  boundToPersonId?: string;
  position: Vector3;
  properties: Record<string, unknown>;
  isVisible: boolean;
}

// =============================================================================
// HOLOSCRIPT TRACKING FUNCTIONS (EXPOSED TO SCRIPTS)
// =============================================================================

/**
 * Functions available in HoloScript tracking context
 */
export const trackingFunctions = {
  /**
   * qr(id) - Create QR code anchor reference
   */
  qr: (id: string): AnchorSpec => ({
    type: 'qr',
    id,
  }),

  /**
   * apriltag(id) - Create AprilTag anchor reference
   */
  apriltag: (id: string): AnchorSpec => ({
    type: 'apriltag',
    id,
  }),

  /**
   * vps(location) - Create VPS (Visual Positioning System) anchor
   */
  vps: (location: string): AnchorSpec => ({
    type: 'vps',
    id: location,
  }),

  /**
   * gps(lat, lng) - Create GPS anchor (outdoor)
   */
  gps: (lat: number, lng: number): AnchorSpec => ({
    type: 'gps',
    id: `${lat},${lng}`,
  }),

  /**
   * character(userId) - Get character ID for a user
   */
  character: (userId: string): string => `char_${userId}`,

  /**
   * offset(person, x, y, z) - Position offset from person
   */
  offset: (personRef: string, x: number, y: number, z: number): PositionRef => ({
    type: 'offset',
    personRef,
    offset: { x, y, z },
  }),

  /**
   * above(person, height) - Position above person's head
   */
  above: (personRef: string, height: number = 0.3): PositionRef => ({
    type: 'offset',
    personRef,
    offset: { x: 0, y: height + 1.8, z: 0 }, // Assuming ~1.8m head height
  }),
};

// =============================================================================
// PARSER HELPERS
// =============================================================================

/**
 * Parse tracking block from HoloScript AST
 */
export function parseTrackingBlock(node: any): TrackingBlock {
  return {
    type: 'tracking',
    mode: node.mode ?? 'multi-user',
    anchor: node.anchor ? parseAnchor(node.anchor) : undefined,
    handlers: (node.handlers ?? []).map(parseHandler),
    config: node.config,
  };
}

function parseAnchor(node: any): AnchorSpec {
  if (typeof node === 'string') {
    // Simple string like "qr://anchor-id"
    const match = node.match(/^(\w+):\/\/(.+)$/);
    if (match) {
      return { type: match[1] as AnchorSpec['type'], id: match[2] };
    }
    return { type: 'qr', id: node };
  }
  return node as AnchorSpec;
}

function parseHandler(node: any): TrackingHandler {
  return {
    event: node.event,
    personParam: node.personParam ?? 'person',
    additionalParams: node.additionalParams,
    body: (node.body ?? []).map(parseStatement),
  };
}

function parseStatement(node: any): TrackingStatement {
  switch (node.type) {
    case 'spawn':
      return {
        type: 'spawn',
        what: node.what,
        characterRef: node.characterRef,
        position: node.position ?? { type: 'person', personRef: 'person' },
        properties: node.properties,
      };
    case 'bind':
      return {
        type: 'bind',
        characterRef: node.characterRef,
        personRef: node.personRef,
      };
    case 'despawn':
      return {
        type: 'despawn',
        characterRef: node.characterRef,
      };
    case 'trigger':
      return {
        type: 'trigger',
        event: node.event,
        data: node.data,
      };
    case 'call':
      return {
        type: 'call',
        function: node.function,
        args: node.args ?? [],
      };
    default:
      throw new Error(`Unknown tracking statement type: ${node.type}`);
  }
}

// =============================================================================
// RUNTIME EXECUTOR
// =============================================================================

/**
 * Execute tracking handler with context
 */
export function executeHandler(
  handler: TrackingHandler,
  context: TrackingContext,
  person: TrackedPersonProxy,
  additionalArgs: Record<string, unknown> = {}
): void {
  // Create execution scope
  const scope: Record<string, unknown> = {
    [handler.personParam]: person,
    ...additionalArgs,
    ...trackingFunctions,
  };

  // Execute each statement
  for (const statement of handler.body) {
    executeStatement(statement, context, scope);
  }
}

function executeStatement(
  statement: TrackingStatement,
  context: TrackingContext,
  scope: Record<string, unknown>
): void {
  switch (statement.type) {
    case 'spawn':
      executeSpawn(statement, context, scope);
      break;
    case 'bind':
      executeBind(statement, context, scope);
      break;
    case 'despawn':
      executeDespawn(statement, context);
      break;
    case 'trigger':
      executeTrigger(statement, scope);
      break;
    case 'call':
      executeCall(statement, scope);
      break;
  }
}

function executeSpawn(
  statement: SpawnStatement,
  context: TrackingContext,
  scope: Record<string, unknown>
): void {
  const position = resolvePosition(statement.position, context, scope);
  const characterId = statement.characterRef ?? `spawned_${Date.now()}`;

  context.characters.set(characterId, {
    id: characterId,
    type: statement.what as CharacterInstance['type'],
    position,
    properties: statement.properties ?? {},
    isVisible: true,
  });
}

function executeBind(
  statement: BindStatement,
  context: TrackingContext,
  scope: Record<string, unknown>
): void {
  const character = context.characters.get(statement.characterRef);
  const person = scope[statement.personRef] as TrackedPersonProxy | undefined;

  if (character && person) {
    character.boundToPersonId = person.id;
    character.position = person.position;
  }
}

function executeDespawn(
  statement: DespawnStatement,
  context: TrackingContext
): void {
  context.characters.delete(statement.characterRef);
}

function executeTrigger(
  statement: TriggerStatement,
  _scope: Record<string, unknown>
): void {
  // Emit event to HoloScript runtime
  console.log(`[HoloScript] Trigger event: ${statement.event}`, statement.data);
}

function executeCall(
  statement: CallStatement,
  scope: Record<string, unknown>
): void {
  const fn = scope[statement.function];
  if (typeof fn === 'function') {
    fn(...statement.args);
  }
}

function resolvePosition(
  ref: PositionRef,
  context: TrackingContext,
  scope: Record<string, unknown>
): Vector3 {
  switch (ref.type) {
    case 'person': {
      const person = scope[ref.personRef] as TrackedPersonProxy | undefined;
      return person?.position ?? { x: 0, y: 0, z: 0 };
    }
    case 'offset': {
      const person = scope[ref.personRef] as TrackedPersonProxy | undefined;
      const base = person?.position ?? { x: 0, y: 0, z: 0 };
      return {
        x: base.x + ref.offset.x,
        y: base.y + ref.offset.y,
        z: base.z + ref.offset.z,
      };
    }
    case 'absolute':
      return ref.position;
  }
}

/**
 * Create a TrackedPersonProxy from raw TrackedPerson data
 */
export function createPersonProxy(person: TrackedPerson): TrackedPersonProxy {
  return {
    id: person.globalId,
    position: person.position,
    velocity: person.velocity,
    userId: person.userId,
    characterId: person.characterId,
    skeleton: person.skeleton,
    confidence: person.confidence,
    isVisible: person.state === 'confirmed',
    timeSinceLastSeen: person.timeSinceUpdate / 30, // Assuming 30fps

    getHeadPosition(): Vector3 {
      // Try to get from skeleton
      const head = person.skeleton?.keypoints3D.find(k => k.name === 'nose');
      if (head) {
        return { x: head.x, y: head.y, z: head.z };
      }
      // Estimate from position (center mass + ~0.7m to head)
      return {
        x: person.position.x,
        y: person.position.y + 0.7,
        z: person.position.z,
      };
    },

    getHandPositions(): { left?: Vector3; right?: Vector3 } {
      const result: { left?: Vector3; right?: Vector3 } = {};
      
      if (person.skeleton) {
        const leftWrist = person.skeleton.keypoints3D.find(k => k.name === 'left_wrist');
        const rightWrist = person.skeleton.keypoints3D.find(k => k.name === 'right_wrist');
        
        if (leftWrist) result.left = { x: leftWrist.x, y: leftWrist.y, z: leftWrist.z };
        if (rightWrist) result.right = { x: rightWrist.x, y: rightWrist.y, z: rightWrist.z };
      }
      
      return result;
    },

    distanceTo(position: Vector3): number {
      const dx = person.position.x - position.x;
      const dy = person.position.y - position.y;
      const dz = person.position.z - position.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },

    isFacing(position: Vector3, thresholdDegrees: number = 45): boolean {
      // Calculate direction from person to target
      const dx = position.x - person.position.x;
      const dz = position.z - person.position.z;
      const targetAngle = Math.atan2(dx, dz);
      
      // Use velocity as facing direction proxy (or skeleton shoulders if available)
      const facingAngle = Math.atan2(person.velocity.x, person.velocity.z);
      
      const angleDiff = Math.abs(targetAngle - facingAngle);
      const normalizedDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);
      
      return normalizedDiff < (thresholdDegrees * Math.PI / 180);
    },
  };
}
