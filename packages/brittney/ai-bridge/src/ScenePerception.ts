/**
 * ScenePerception - Brittney's "Eyes"
 *
 * Converts a HololandWorld scene graph into a compact text representation
 * that an LLM can consume as spatial perception. Designed for ~200 token
 * budgets so it fits in tool call context windows without dominating them.
 *
 * Two entry points:
 *   serializeScene()     — from a HololandWorld instance
 *   serializeObjects()   — from a raw array of serialized objects (JSON)
 *
 * @module @hololand/ai-bridge/ScenePerception
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/** Matches SpatialObject.toJSON() output */
export interface SerializedObject {
  id: string;
  type: string;
  position: Vector3;
  rotation?: { x: number; y: number; z: number; w: number };
  scale: Vector3;
  metadata: Record<string, any>;
  physics?: { enabled: boolean; mass?: number; velocity?: Vector3 };
  interactive: boolean;
  visible: boolean;
  active: boolean;
  childCount: number;
}

/** Minimal world-level interface (avoids hard dep on @hololand/world) */
export interface WorldLike {
  getState(): {
    name: string;
    objects: Map<string, { toJSON(): SerializedObject }>;
    totalObjects: number;
    bounds: { min: Vector3; max: Vector3 };
    gravity: Vector3;
  };
}

export interface ScenePerceptionOptions {
  /** Target token budget. ~4 chars ≈ 1 token. Default: 200 */
  maxTokens?: number;
  /** Max objects to describe. Default: 20 */
  maxObjects?: number;
  /** Viewer position for distance sorting. Default: origin */
  viewerPosition?: Vector3;
  /** Only include objects within this radius (meters). Default: Infinity */
  viewerRadius?: number;
  /** How much detail per object. Default: 'standard' */
  detailLevel?: 'minimal' | 'standard' | 'detailed';
  /** Include environment summary (gravity, bounds). Default: true */
  includeEnvironment?: boolean;
  /** Include parent→child hierarchy summary. Default: true */
  includeHierarchy?: boolean;
}

export interface ScenePerception {
  /** The compact text representation for LLM consumption */
  text: string;
  /** Estimated token count (~4 chars per token) */
  tokenEstimate: number;
  /** Total objects in the world */
  objectCount: number;
  /** How many objects were included in the description */
  describedCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHARS_PER_TOKEN = 4;
const DEFAULT_MAX_TOKENS = 200;
const DEFAULT_MAX_OBJECTS = 20;
const ORIGIN: Vector3 = { x: 0, y: 0, z: 0 };

// Distance bands for grouping (meters)
const NEAR_THRESHOLD = 5;
const MID_THRESHOLD = 15;

// ─── Core serializer ─────────────────────────────────────────────────────────

/**
 * Serialize a HololandWorld into a compact text perception.
 */
export function serializeScene(
  world: WorldLike,
  options: ScenePerceptionOptions = {}
): ScenePerception {
  const state = world.getState();
  const objects: SerializedObject[] = [];

  for (const obj of state.objects.values()) {
    objects.push(obj.toJSON());
  }

  return serializeObjects(objects, {
    worldName: state.name,
    gravity: state.gravity,
    bounds: state.bounds,
    ...options,
  });
}

/**
 * Serialize a raw array of objects (e.g. from JSON snapshot, SharedDataBridge).
 */
export function serializeObjects(
  objects: SerializedObject[],
  options: ScenePerceptionOptions & {
    worldName?: string;
    gravity?: Vector3;
    bounds?: { min: Vector3; max: Vector3 };
  } = {}
): ScenePerception {
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const maxObjects = options.maxObjects ?? DEFAULT_MAX_OBJECTS;
  const viewer = options.viewerPosition ?? ORIGIN;
  const radius = options.viewerRadius ?? Infinity;
  const detail = options.detailLevel ?? 'standard';
  const includeEnv = options.includeEnvironment ?? true;
  const includeHier = options.includeHierarchy ?? true;

  // Filter: only visible + active objects within radius
  const candidates = objects
    .filter((o) => o.visible && o.active)
    .map((o) => ({ obj: o, dist: distance(viewer, o.position) }))
    .filter((e) => e.dist <= radius)
    .sort((a, b) => a.dist - b.dist);

  const totalCount = objects.length;
  const charBudget = maxTokens * CHARS_PER_TOKEN;

  // Build output lines
  const lines: string[] = [];

  // Header
  const worldName = options.worldName ?? 'Scene';
  lines.push(`${worldName} | ${totalCount} objects`);

  // Environment summary
  if (includeEnv && options.gravity) {
    const g = options.gravity;
    const gravLabel = isStandardGravity(g) ? 'standard' : `[${r(g.x)},${r(g.y)},${r(g.z)}]`;
    lines.push(`gravity: ${gravLabel}`);
  }

  // Group by distance band
  const near: typeof candidates = [];
  const mid: typeof candidates = [];
  const far: typeof candidates = [];

  for (const entry of candidates) {
    if (entry.dist < NEAR_THRESHOLD) near.push(entry);
    else if (entry.dist < MID_THRESHOLD) mid.push(entry);
    else far.push(entry);
  }

  let described = 0;
  const cap = Math.min(candidates.length, maxObjects);

  // Emit distance bands
  described += emitBand(lines, 'NEAR', near, detail, cap - described);
  described += emitBand(lines, 'MID', mid, detail, cap - described);
  described += emitBand(lines, 'FAR', far, detail, cap - described);

  // Hierarchy summary (parents with >0 children)
  if (includeHier) {
    const parents = candidates.filter((e) => e.obj.childCount > 0).slice(0, 5);

    if (parents.length > 0) {
      lines.push('');
      lines.push('Groups:');
      for (const p of parents) {
        lines.push(`  "${nameOf(p.obj)}" → ${p.obj.childCount} children`);
      }
    }
  }

  // Omitted count
  if (candidates.length > cap) {
    lines.push(`...+${candidates.length - cap} more objects`);
  }

  // Trim to token budget
  let text = lines.join('\n');
  if (text.length > charBudget) {
    text = trimToCharBudget(lines, charBudget);
  }

  return {
    text,
    tokenEstimate: Math.ceil(text.length / CHARS_PER_TOKEN),
    objectCount: totalCount,
    describedCount: described,
  };
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function emitBand(
  lines: string[],
  label: string,
  band: { obj: SerializedObject; dist: number }[],
  detail: 'minimal' | 'standard' | 'detailed',
  remaining: number
): number {
  if (band.length === 0 || remaining <= 0) return 0;

  lines.push('');
  lines.push(`${label}:`);

  const count = Math.min(band.length, remaining);
  for (let i = 0; i < count; i++) {
    lines.push('  ' + describeObject(band[i].obj, band[i].dist, detail));
  }

  if (band.length > count) {
    lines.push(`  ...+${band.length - count} more`);
  }

  return count;
}

function describeObject(
  obj: SerializedObject,
  dist: number,
  detail: 'minimal' | 'standard' | 'detailed'
): string {
  const name = nameOf(obj);
  const geo = obj.type !== 'box' ? ` ${obj.type}` : '';
  const traits = formatTraits(obj.metadata);
  const pos = formatPosition(obj.position);
  const scale = formatScale(obj.scale);
  const inter = obj.interactive ? ' interactive' : '';

  if (detail === 'minimal') {
    return `"${name}"${geo}${traits} ${pos}`;
  }

  if (detail === 'detailed') {
    const physics = formatPhysics(obj.physics);
    const color = obj.metadata?.color ? ` color=${obj.metadata.color}` : '';
    const material = obj.metadata?.material ? ` mat=${obj.metadata.material}` : '';
    const distStr = ` d=${r(dist)}m`;
    return `"${name}"${geo}${traits} ${pos}${scale}${inter}${color}${material}${physics}${distStr}`;
  }

  // standard
  return `"${name}"${geo}${traits} ${pos}${scale}${inter}`;
}

function nameOf(obj: SerializedObject): string {
  return obj.metadata?.name || obj.id;
}

function formatTraits(metadata: Record<string, any>): string {
  const traits: string[] = metadata?.traits;
  if (!traits || traits.length === 0) return '';
  // Show up to 4 traits
  const shown = traits.slice(0, 4).map((t) => `@${t}`);
  const suffix = traits.length > 4 ? ` +${traits.length - 4}` : '';
  return ' ' + shown.join(' ') + suffix;
}

function formatPosition(pos: Vector3): string {
  // Omit if at origin
  if (pos.x === 0 && pos.y === 0 && pos.z === 0) return 'pos=[0,0,0]';
  return `pos=[${r(pos.x)},${r(pos.y)},${r(pos.z)}]`;
}

function formatScale(scale: Vector3): string {
  // Omit if uniform 1
  if (scale.x === 1 && scale.y === 1 && scale.z === 1) return '';
  // Uniform non-1
  if (scale.x === scale.y && scale.y === scale.z) return ` s=${r(scale.x)}`;
  return ` s=[${r(scale.x)},${r(scale.y)},${r(scale.z)}]`;
}

function formatPhysics(physics?: SerializedObject['physics']): string {
  if (!physics?.enabled) return '';
  const parts = [' physics'];
  if (physics.mass != null && physics.mass !== 1) parts.push(`m=${r(physics.mass)}`);
  return parts.join(':');
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function distance(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function r(n: number): string {
  // Round to 1 decimal, strip trailing .0
  const rounded = Math.round(n * 10) / 10;
  return rounded === Math.floor(rounded) ? String(rounded) : rounded.toFixed(1);
}

function isStandardGravity(g: Vector3): boolean {
  return g.x === 0 && Math.abs(g.y + 9.81) < 0.01 && g.z === 0;
}

function trimToCharBudget(lines: string[], budget: number): string {
  // Progressively drop lines from the bottom (farthest objects first)
  // but always keep the header
  let text = lines.join('\n');
  while (text.length > budget && lines.length > 2) {
    lines.pop();
    text = lines.join('\n');
  }
  if (text.length > budget) {
    text = text.slice(0, budget - 3) + '...';
  }
  return text;
}
