export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

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
  maxTokens?: number;
  maxObjects?: number;
  viewerPosition?: Vector3;
  viewerRadius?: number;
  detailLevel?: 'minimal' | 'standard' | 'detailed';
  includeEnvironment?: boolean;
  includeHierarchy?: boolean;
}

export interface ScenePerception {
  text: string;
  tokenEstimate: number;
  objectCount: number;
  describedCount: number;
}

const CHARS_PER_TOKEN = 4;
const ORIGIN: Vector3 = { x: 0, y: 0, z: 0 };

export function serializeScene(world: WorldLike, options: ScenePerceptionOptions = {}): ScenePerception {
  const state = world.getState();
  return serializeObjects(
    Array.from(state.objects.values()).map((object) => object.toJSON()),
    {
      worldName: state.name,
      gravity: state.gravity,
      bounds: state.bounds,
      ...options,
    },
  );
}

export function serializeObjects(
  objects: SerializedObject[],
  options: ScenePerceptionOptions & {
    worldName?: string;
    gravity?: Vector3;
    bounds?: { min: Vector3; max: Vector3 };
  } = {},
): ScenePerception {
  const maxTokens = options.maxTokens ?? 200;
  const maxObjects = options.maxObjects ?? 20;
  const viewer = options.viewerPosition ?? ORIGIN;
  const radius = options.viewerRadius ?? Infinity;
  const detail = options.detailLevel ?? 'standard';

  const candidates = objects
    .filter((object) => object.visible && object.active)
    .map((object) => ({ object, distance: distance(viewer, object.position) }))
    .filter((entry) => entry.distance <= radius)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxObjects);

  const lines = [`${options.worldName ?? 'Scene'} | ${objects.length} objects`];
  if (options.includeEnvironment !== false && options.gravity) {
    lines.push(`gravity: [${round(options.gravity.x)},${round(options.gravity.y)},${round(options.gravity.z)}]`);
  }

  for (const entry of candidates) {
    lines.push(describeObject(entry.object, entry.distance, detail));
  }

  if (options.includeHierarchy !== false) {
    const grouped = candidates.filter((entry) => entry.object.childCount > 0).slice(0, 5);
    if (grouped.length > 0) {
      lines.push('Groups:');
      for (const entry of grouped) lines.push(`"${nameOf(entry.object)}" -> ${entry.object.childCount} children`);
    }
  }

  const budget = maxTokens * CHARS_PER_TOKEN;
  let text = lines.join('\n');
  if (text.length > budget) text = `${text.slice(0, Math.max(0, budget - 3))}...`;

  return {
    text,
    tokenEstimate: Math.ceil(text.length / CHARS_PER_TOKEN),
    objectCount: objects.length,
    describedCount: candidates.length,
  };
}

function describeObject(
  object: SerializedObject,
  distanceMeters: number,
  detail: 'minimal' | 'standard' | 'detailed',
): string {
  const traits = Array.isArray(object.metadata?.traits)
    ? ` ${object.metadata.traits.slice(0, 4).map((trait: string) => `@${trait}`).join(' ')}`
    : '';
  const base = `"${nameOf(object)}" ${object.type}${traits} pos=[${round(object.position.x)},${round(object.position.y)},${round(object.position.z)}]`;
  if (detail === 'minimal') return base;

  const scale = object.scale.x === object.scale.y && object.scale.y === object.scale.z
    ? ` s=${round(object.scale.x)}`
    : ` s=[${round(object.scale.x)},${round(object.scale.y)},${round(object.scale.z)}]`;
  if (detail === 'standard') return `${base}${scale}${object.interactive ? ' interactive' : ''}`;

  const physics = object.physics?.enabled ? ` physics${object.physics.mass ? `:${round(object.physics.mass)}` : ''}` : '';
  return `${base}${scale}${object.interactive ? ' interactive' : ''}${physics} d=${round(distanceMeters)}m`;
}

function nameOf(object: SerializedObject): string {
  return typeof object.metadata?.name === 'string' ? object.metadata.name : object.id;
}

function distance(a: Vector3, b: Vector3): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function round(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
