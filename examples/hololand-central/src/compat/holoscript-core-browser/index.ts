type Listener = (payload?: unknown) => void;

interface ParseError {
  line: number;
  message: string;
}

interface ParseResult {
  success: boolean;
  ast: BrowserHoloScriptAst;
  program: BrowserHoloScriptAst;
  errors: ParseError[];
}

interface BrowserHoloScriptAst {
  source: string;
  root: {
    directives: HoloDirective[];
  };
  body: HoloDirective[];
  entities: BrowserHoloEntity[];
}

interface HoloDirective {
  type: 'npc' | 'dialog';
  name: string;
  props: Record<string, unknown>;
  options?: Array<{
    text: string;
    target: string | { type: 'directive'; value: { name: string } };
  }>;
}

interface BrowserHoloEntity {
  id: string;
  type: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color?: string;
  mesh?: string;
  text?: string;
  glow?: boolean;
  interactive?: boolean;
  traits: string[];
  properties: Record<string, unknown>;
}

interface Renderer {
  createElement(type: string, properties: Record<string, unknown>): string;
  updateElement(id: string, properties: Record<string, unknown>): void;
  destroy(id: string): void;
}

// =============================================================================
// VR CONTEXT TYPES
// =============================================================================

export interface VRControllerState {
  connected: boolean;
  position: [number, number, number];
  rotation: [number, number, number, number]; // quaternion x,y,z,w
  trigger: boolean;
  grip: boolean;
  thumbstick: { x: number; y: number };
}

export interface VRHandJointState {
  name: string;
  position: [number, number, number];
  rotation: [number, number, number, number];
  radius: number;
}

export interface VRHandState {
  joints: VRHandJointState[];
  gesture: string | null;
  confidence: number;
}

export interface VRContext {
  headset: {
    position: [number, number, number];
    rotation: [number, number, number];
  };
  controllers: {
    left: VRControllerState | null;
    right: VRControllerState | null;
  };
  hands: {
    left: VRHandState | null;
    right: VRHandState | null;
  };
}

const DEFAULT_ALIASES: Record<string, string> = {
  brian: 'brian_flexing',
  robot: 'robot_v2',
};

function parseBlockProperties(block: string): { props: Record<string, unknown>; traits: string[] } {
  const props: Record<string, unknown> = {};
  const traits: string[] = [];

  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.replace(/\/\/.*$/, '').trim();
    if (!line) continue;

    if (line.startsWith('@')) {
      traits.push(line.slice(1).trim());
      continue;
    }

    const match = line.match(/^([\w-]+)\s*:\s*(.+)$/);
    if (match) {
      props[match[1]] = parseValue(match[2]);
    }
  }

  return { props, traits };
}

function parseValue(raw: string): unknown {
  const value = raw.trim().replace(/,$/, '');

  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (value.startsWith('[') && value.endsWith(']')) {
    return value
      .slice(1, -1)
      .split(',')
      .map((entry) => parseValue(entry.trim()));
  }
  if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1);
  if (value.startsWith('@')) {
    const directive = value.match(/^@([\w-]+)(?:\s+"([^"]+)")?/);
    if (directive) {
      return { type: 'directive', value: { name: directive[2] ?? directive[1] } };
    }
  }

  return value;
}

function parseTemplates(source: string) {
  const templates = new Map<string, { props: Record<string, unknown>; traits: string[] }>();
  const templatePattern = /template\s+"([^"]+)"\s*\{([\s\S]*?)\n\s*\}/g;
  let match: RegExpExecArray | null;

  while ((match = templatePattern.exec(source))) {
    templates.set(match[1], parseBlockProperties(match[2]));
  }

  return templates;
}

function toVector(value: unknown, fallback: [number, number, number]): [number, number, number] {
  if (!Array.isArray(value) || value.length < 3) return fallback;
  return [Number(value[0]) || 0, Number(value[1]) || 0, Number(value[2]) || 0];
}

function parseEntities(source: string): BrowserHoloEntity[] {
  const templates = parseTemplates(source);
  const entities: BrowserHoloEntity[] = [];
  const objectPattern = /object\s+"([^"]+)"(?:\s+using\s+"([^"]+)")?\s*\{([\s\S]*?)\n\s*\}/g;
  let match: RegExpExecArray | null;

  while ((match = objectPattern.exec(source))) {
    const [, id, templateName, body] = match;
    const template = templateName ? templates.get(templateName) : undefined;
    const local = parseBlockProperties(body);
    const properties = { ...(template?.props ?? {}), ...local.props };
    const traits = [...(template?.traits ?? []), ...local.traits];
    const mesh = String(properties.geometry ?? properties.mesh ?? properties.shape ?? 'orb');

    entities.push({
      id,
      type: mesh,
      position: toVector(properties.position, [0, 0, 0]),
      rotation: toVector(properties.rotation, [0, 0, 0]),
      scale: toVector(properties.scale, [1, 1, 1]),
      color: properties.color ? String(properties.color) : undefined,
      mesh,
      text: properties.text ? String(properties.text) : undefined,
      glow: traits.includes('glow') || traits.includes('pulse') || properties.glow === true,
      interactive: properties.interactive !== false,
      traits,
      properties: {
        id,
        ...properties,
        traits,
      },
    });
  }

  return entities;
}

function parseDirectives(source: string): HoloDirective[] {
  const directives: HoloDirective[] = [];
  const directivePattern = /@(npc|dialog)\s+"([^"]+)"\s*\{([\s\S]*?)\n\}/g;
  let match: RegExpExecArray | null;

  while ((match = directivePattern.exec(source))) {
    const [, type, name, body] = match;
    const { props } = parseBlockProperties(body);
    const options =
      type === 'dialog'
        ? [...body.matchAll(/option\s+"([^"]+)"\s*->\s*(@?[^"\s]+|"[^"]+")/g)].map((option) => {
            const target = option[2].replace(/^"|"$/g, '');
            return {
              text: option[1],
              target: target.startsWith('@')
                ? { type: 'directive' as const, value: { name: target.slice(1) } }
                : target,
            };
          })
        : undefined;

    directives.push({
      type: type as 'npc' | 'dialog',
      name,
      props,
      options,
    });
  }

  return directives;
}

export function parseHoloScriptPlus(source: string): ParseResult {
  const directives = parseDirectives(source);
  const ast: BrowserHoloScriptAst = {
    source,
    root: { directives },
    body: directives,
    entities: parseEntities(source),
  };

  return {
    success: true,
    ast,
    program: ast,
    errors: [],
  };
}

export function parseHolo(source: string) {
  return parseHoloScriptPlus(source).ast;
}

export class HoloScriptPlusParser {
  parse(source: string): ParseResult {
    return parseHoloScriptPlus(source);
  }
}

export class HoloScriptPlusRuntimeImpl {
  private variables = new Map<string, unknown>();
  private listeners = new Map<string, Set<Listener>>();
  private holograms = new Map<string, BrowserHoloEntity>();
  private mountedIds = new Set<string>();
  private vrContext: VRContext | null = null;

  constructor(
    private ast: BrowserHoloScriptAst = parseHoloScriptPlus('').ast,
    private options: { renderer?: Renderer; vrEnabled?: boolean } = {}
  ) {}

  mount(_target?: unknown) {
    const renderer = this.options.renderer;
    if (!renderer) return;

    for (const entity of this.ast.entities) {
      const id = renderer.createElement(entity.type, entity.properties);
      this.mountedIds.add(id);
      this.holograms.set(id, entity);
    }
  }

  unmount() {
    const renderer = this.options.renderer;
    if (renderer) {
      for (const id of this.mountedIds) renderer.destroy(id);
    }
    this.mountedIds.clear();
    this.holograms.clear();
  }

  setVariable(name: string, value: unknown) {
    this.variables.set(name, value);
  }

  getVariable(name: string) {
    return this.variables.get(name);
  }

  on(event: string, listener: Listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    return () => this.listeners.get(event)?.delete(listener);
  }

  emit(event: string, payload?: unknown) {
    for (const listener of this.listeners.get(event) ?? []) listener(payload);
  }

  updateVRContext(context: VRContext) {
    this.vrContext = context;
  }

  getVRContext(): VRContext | null {
    return this.vrContext;
  }

  update(_delta: number) {}

  getContext() {
    return { spatialMemory: this.holograms, vr: this.vrContext };
  }

  getHologramStates() {
    return this.holograms;
  }

  updateEntity(id: string, properties: Record<string, unknown>) {
    this.options.renderer?.updateElement(id, properties);
    const current = this.holograms.get(id);
    if (current) {
      this.holograms.set(id, {
        ...current,
        properties: { ...current.properties, ...properties },
      });
    }
  }

  createEntity(type: string, properties: Record<string, unknown> = {}) {
    const id =
      this.options.renderer?.createElement(type, properties) ?? String(properties.id ?? type);
    this.mountedIds.add(id);
    this.holograms.set(id, {
      id,
      type,
      position: toVector(properties.position, [0, 0, 0]),
      rotation: toVector(properties.rotation, [0, 0, 0]),
      scale: toVector(properties.scale, [1, 1, 1]),
      mesh: String(properties.mesh ?? properties.shape ?? type),
      traits: Array.isArray(properties.traits) ? (properties.traits as string[]) : [],
      properties,
    });
  }

  reset() {
    this.unmount();
    this.variables.clear();
  }

  compile(ast: BrowserHoloScriptAst) {
    return ast;
  }
}

export class HoloScriptRuntime extends HoloScriptPlusRuntimeImpl {}

export class HoloScriptLoader {
  load(source: string) {
    return parseHoloScriptPlus(source).ast;
  }
}

export class VRTraitRegistry {}

export function resolveAssetAlias(name: string, aliases: Record<string, string> = {}) {
  return aliases[name] ?? DEFAULT_ALIASES[name] ?? name;
}

export type ASTNode = Record<string, unknown>;
export type HoloMaterialType = string;
export type TextureChannel = string;
export type TextureMapDef = Record<string, unknown>;
export type ShaderPassDef = Record<string, unknown>;

export interface MaterialDefinition {
  name: string;
  type: HoloMaterialType;
  properties: Record<string, unknown>;
  textures?: TextureMapDef[];
  shaderPasses?: ShaderPassDef[];
}

export type CompositionMaterialNode = ASTNode;

export class HoloScriptMaterialParser {
  static parse(node: ASTNode): MaterialDefinition {
    return HoloScriptMaterialParser.parseJSON(node);
  }

  static parseJSON(json: Record<string, unknown>): MaterialDefinition {
    return {
      name: String(json.name ?? json.id ?? 'material'),
      type: String(json.type ?? json.materialType ?? 'standard'),
      properties: {
        ...json,
        ...(typeof json.properties === 'object' && json.properties !== null
          ? (json.properties as Record<string, unknown>)
          : {}),
      },
      textures: Array.isArray(json.textures) ? (json.textures as TextureMapDef[]) : undefined,
      shaderPasses: Array.isArray(json.shaderPasses)
        ? (json.shaderPasses as ShaderPassDef[])
        : undefined,
    };
  }

  static parseAll(nodes: ASTNode[]): MaterialDefinition[] {
    return nodes.map((node) => HoloScriptMaterialParser.parse(node));
  }

  static parseFromComposition(nodes: ASTNode[]): MaterialDefinition[] {
    return HoloScriptMaterialParser.parseAll(nodes);
  }
}

export type HoloComposition = BrowserHoloScriptAst;
export type HoloObjectDecl = BrowserHoloEntity;
export type HoloState = Record<string, unknown>;
export type HSPlusAST = BrowserHoloScriptAst;
export type RuntimeOptions = {
  renderer?: Renderer;
  vrEnabled?: boolean;
  companions?: Record<string, unknown>;
};
export type R3FNode = {
  id?: string;
  type?: string;
  props: Record<string, unknown>;
  children?: R3FNode[];
};
export type AIDriverConfig = Record<string, unknown>;
export type NPCContext = {
  position: Vec3;
  active: boolean;
  dialogue: {
    lastSaid?: string;
    history: string[];
  };
};

export interface ProceduralGeometryData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array | Uint32Array;
}

type Vec3 = [number, number, number];

function normalizeVec3(value: unknown, fallback: Vec3): Vec3 {
  if (!Array.isArray(value) || value.length < 3) return fallback;
  return [Number(value[0]) || 0, Number(value[1]) || 0, Number(value[2]) || 0];
}

function createBoxGeometry(size = 1): ProceduralGeometryData {
  const s = size / 2;
  const positions = new Float32Array([
    -s,
    -s,
    s,
    s,
    -s,
    s,
    s,
    s,
    s,
    -s,
    s,
    s,
    s,
    -s,
    -s,
    -s,
    -s,
    -s,
    -s,
    s,
    -s,
    s,
    s,
    -s,
    -s,
    s,
    -s,
    -s,
    s,
    s,
    -s,
    -s,
    s,
    -s,
    -s,
    -s,
    s,
    -s,
    s,
    s,
    -s,
    -s,
    s,
    s,
    -s,
    s,
    s,
    s,
    -s,
    -s,
    -s,
    s,
    -s,
    -s,
    s,
    -s,
    s,
    -s,
    s,
    s,
    -s,
    s,
    s,
    s,
    s,
    -s,
  ]);
  const normals = new Float32Array([
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 1, 0, 0, 1, 0, 0,
    1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1,
    0, 0, -1, 0, 0, -1, 0, 0, -1,
  ]);
  const uvs = new Float32Array([
    0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1,
  ]);
  const indices = new Uint16Array([
    0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16,
    18, 19, 20, 21, 22, 20, 22, 23,
  ]);

  return { positions, normals, uvs, indices };
}

function createSphereGeometry(radius = 1, segments = 16): ProceduralGeometryData {
  const widthSegments = Math.max(8, Math.floor(segments));
  const heightSegments = Math.max(4, Math.floor(segments / 2));
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let y = 0; y <= heightSegments; y++) {
    const v = y / heightSegments;
    const phi = v * Math.PI;

    for (let x = 0; x <= widthSegments; x++) {
      const u = x / widthSegments;
      const theta = u * Math.PI * 2;
      const nx = Math.cos(theta) * Math.sin(phi);
      const ny = Math.cos(phi);
      const nz = Math.sin(theta) * Math.sin(phi);

      positions.push(nx * radius, ny * radius, nz * radius);
      normals.push(nx, ny, nz);
      uvs.push(u, 1 - v);
    }
  }

  for (let y = 0; y < heightSegments; y++) {
    for (let x = 0; x < widthSegments; x++) {
      const a = y * (widthSegments + 1) + x;
      const b = a + widthSegments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices),
  };
}

function createRibbonGeometry(points: Vec3[], radius = 0.1): ProceduralGeometryData {
  if (points.length < 2) return createBoxGeometry(radius * 2);

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < points.length; i++) {
    const [x, y, z] = points[i];
    positions.push(x - radius, y, z, x + radius, y, z);
    normals.push(0, 1, 0, 0, 1, 0);
    const v = points.length === 1 ? 0 : i / (points.length - 1);
    uvs.push(0, v, 1, v);
  }

  for (let i = 0; i < points.length - 1; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices),
  };
}

export function generateHullGeometry(
  blobs: Array<{ position?: unknown; radius?: number }> = [],
  resolution = 16,
  _threshold = 1
): ProceduralGeometryData {
  const radius =
    blobs.reduce((largest, blob) => Math.max(largest, Number(blob.radius) || 0), 0) || 1;
  return createSphereGeometry(radius, resolution);
}

export function generateSplineGeometry(
  points: unknown[] = [],
  radii: number[] = [0.1],
  _segments = 32,
  _radialSegments = 12
): ProceduralGeometryData {
  const normalized = points.map((point) => normalizeVec3(point, [0, 0, 0]));
  return createRibbonGeometry(normalized, Number(radii[0]) || 0.1);
}

export function generateMembraneGeometry(
  anchors: unknown[] = [],
  _subdivisions = 8
): ProceduralGeometryData {
  const normalized = anchors.map((anchor) => normalizeVec3(anchor, [0, 0, 0]));
  if (normalized.length >= 2) return createRibbonGeometry(normalized, 0.02);
  return createBoxGeometry(1);
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function generateScaleTexture(
  size = 512,
  baseColor: [number, number, number] = [46, 28, 92]
) {
  const pixels = new Uint8Array(size * size * 4);
  const color = baseColor.map((channel) => (channel <= 1 ? channel * 255 : channel));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4;
      const scale = ((x + Math.floor(y * 0.5)) % 32) / 32;
      const edge = scale < 0.08 || scale > 0.92 ? 0.55 : 1;

      pixels[index] = clampByte(color[0] * edge);
      pixels[index + 1] = clampByte(color[1] * edge);
      pixels[index + 2] = clampByte(color[2] * edge);
      pixels[index + 3] = 255;
    }
  }

  return pixels;
}

export function generateScaleNormalMap(size = 512) {
  const pixels = new Uint8Array(size * size * 4);

  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 128;
    pixels[i + 1] = 128;
    pixels[i + 2] = 255;
    pixels[i + 3] = 255;
  }

  return pixels;
}

export class R3FCompiler {
  compile(ast?: BrowserHoloScriptAst | null): R3FNode {
    if (!ast) return { type: 'group', props: {}, children: [] };

    return {
      type: 'group',
      props: {},
      children: ast.entities.map((entity) => ({
        id: entity.id,
        type: 'mesh',
        props: {
          hsType: entity.mesh ?? entity.type,
          position: entity.position,
          rotation: entity.rotation,
          scale: entity.scale,
          color: entity.color,
          text: entity.text,
          ...entity.properties,
        },
        children: [],
      })),
    };
  }

  compileComposition(
    composition: BrowserHoloScriptAst | { entities?: BrowserHoloEntity[] }
  ): R3FNode {
    if ('root' in composition) return this.compile(composition);

    return {
      type: 'group',
      props: {},
      children: (composition.entities ?? []).map((entity) => ({
        id: entity.id,
        type: 'mesh',
        props: {
          hsType: entity.mesh ?? entity.type,
          position: entity.position,
          rotation: entity.rotation,
          scale: entity.scale,
          color: entity.color,
          text: entity.text,
          ...entity.properties,
        },
        children: [],
      })),
    };
  }
}

export const MATERIAL_PRESETS: Record<string, Record<string, unknown>> = {
  glass: { transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0, transmission: 0.6 },
  hologram: { transparent: true, opacity: 0.7, emissive: '#38bdf8', emissiveIntensity: 0.35 },
  metal: { roughness: 0.28, metalness: 0.9 },
  matte: { roughness: 0.82, metalness: 0.05 },
  neon: { emissive: '#22d3ee', emissiveIntensity: 0.8 },
  plastic: { roughness: 0.48, metalness: 0.1 },
};

export const SHADER_PRESETS: Record<string, Record<string, unknown>> = {
  hologram: {
    vertexShader: 'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'void main(){gl_FragColor=vec4(0.2,0.8,1.0,0.65);}',
    transparent: true,
  },
  pulse: {
    vertexShader: 'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'void main(){gl_FragColor=vec4(0.5,1.0,0.8,1.0);}',
  },
};

type CoreListener = (event?: unknown) => void;

class CoreEventTarget {
  private listeners = new Map<string, Set<CoreListener>>();

  on(event: string, callback: CoreListener): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: CoreListener): void {
    this.listeners.get(event)?.delete(callback);
  }

  protected emit(event: string, payload?: unknown): void {
    for (const callback of this.listeners.get(event) ?? []) callback(payload);
  }

  dispose(): void {
    this.listeners.clear();
  }
}

export type VisemeTimestamp = {
  viseme: string;
  time?: number;
  offset?: number;
  duration?: number;
};

export class LipSyncTrait extends CoreEventTarget {
  private activeSession: string | null = null;
  private currentViseme = 'sil';
  private isSpeaking = false;
  private morphWeights: Record<string, number> = {};
  private visemeTimestamps: VisemeTimestamp[] = [];

  constructor(private config: Record<string, unknown> = {}) {
    super();
  }

  getConfig() {
    return this.config;
  }

  getActiveSession() {
    return this.activeSession;
  }

  getIsSpeaking() {
    return this.isSpeaking;
  }

  getCurrentViseme() {
    return this.currentViseme;
  }

  startSession(options: Record<string, unknown> = {}) {
    this.activeSession = String(options.id ?? `lip-${Date.now()}`);
    this.isSpeaking = true;
    this.emit('session-start', { sessionId: this.activeSession, options });
    return this.activeSession;
  }

  endSession() {
    const sessionId = this.activeSession;
    this.activeSession = null;
    this.isSpeaking = false;
    this.currentViseme = 'sil';
    this.morphWeights = {};
    this.emit('session-end', { sessionId });
  }

  initFFT(_context: unknown, _source: unknown) {}

  disposeFFT() {}

  setVisemeTimestamps(visemeData: VisemeTimestamp[]) {
    this.visemeTimestamps = [...visemeData];
  }

  update(deltaTime = 0) {
    if (this.visemeTimestamps.length > 0 && this.isSpeaking) {
      const elapsed = (Date.now() / 1000 + deltaTime) % 60;
      const next = this.visemeTimestamps.find((item) => {
        const start = Number(item.time ?? item.offset ?? 0);
        const end = start + Number(item.duration ?? 0.12);
        return elapsed >= start && elapsed <= end;
      });
      if (next) this.setViseme(next.viseme, 1);
    }

    return this.getMorphWeights();
  }

  getMorphWeights() {
    return { ...this.morphWeights };
  }

  setViseme(viseme: string, weight = 1) {
    this.currentViseme = viseme;
    this.morphWeights = { [`viseme_${viseme}`]: weight };
    this.emit('viseme-change', { viseme, weight });
  }

  setBlendShapeWeights(weights: Record<string, number>) {
    this.morphWeights = { ...weights };
    this.emit('weights-change', { weights: this.getMorphWeights() });
  }

  override dispose() {
    this.endSession();
    super.dispose();
  }
}

type EmotionSegment = {
  text?: string;
  emotion?: string;
  expression?: string;
  animation?: string;
  voiceStyle?: string;
};

type TriggeringDirective = {
  action: string;
  intensity?: number;
  duration?: number;
};

export class EmotionDirectiveTrait extends CoreEventTarget {
  private expression = 'neutral';
  private animation = 'idle';
  private mood = 'neutral';
  private moodIntensity = 0;
  private segments: EmotionSegment[] = [];
  private currentSegmentIndex = -1;
  private pendingTriggers: TriggeringDirective[] = [];

  constructor(private config: Record<string, unknown> = {}) {
    super();
  }

  getConfig() {
    return this.config;
  }

  getState() {
    return {
      expression: this.expression,
      animation: this.animation,
      mood: this.mood,
      moodIntensity: this.moodIntensity,
      pendingTriggers: [...this.pendingTriggers],
    };
  }

  processResponse(response: { segments?: EmotionSegment[] } = {}) {
    this.segments = response.segments ?? [];
    this.currentSegmentIndex = this.segments.length > 0 ? 0 : -1;
    const segment = this.getCurrentSegment();
    if (segment) this.applySegment(segment);
    this.emit('response-start', { response });
  }

  advanceSegment() {
    if (this.currentSegmentIndex < 0) return null;
    this.currentSegmentIndex += 1;
    const segment = this.getCurrentSegment();

    if (segment) {
      this.applySegment(segment);
      return segment;
    }

    this.emit('response-end');
    return null;
  }

  getCurrentSegment() {
    return this.segments[this.currentSegmentIndex] ?? null;
  }

  getCurrentSegmentIndex() {
    return this.currentSegmentIndex;
  }

  setConditionalState(directive: Record<string, unknown>) {
    const state = String(directive.state ?? 'idle');
    this.expression = String(
      directive.expression ?? (state === 'thinking' ? 'thinking' : 'neutral')
    );
    this.animation = String(directive.animation ?? state);
    this.emit('animation-change', {
      animation: this.animation,
      expression: this.expression,
      state,
    });
  }

  setExpression(expression: string, _blendTime?: number) {
    this.expression = expression;
    this.emit('expression-change', { expression });
  }

  setAnimation(animation: string) {
    this.animation = animation;
    this.emit('animation-change', { animation });
  }

  fireTrigger(directive: TriggeringDirective) {
    this.pendingTriggers.push(directive);
    this.emit('trigger-fire', directive);
  }

  consumeTrigger() {
    return this.pendingTriggers.shift() ?? null;
  }

  generateFiller() {
    this.fireTrigger({ action: 'idle-filler', duration: 0.8, intensity: 0.35 });
  }

  getCurrentAnimationClip() {
    return this.animation;
  }

  update(_deltaTime = 0) {
    const weight = this.expression === 'neutral' ? 0 : Math.max(0.15, this.moodIntensity);
    return { [this.expression]: weight };
  }

  private applySegment(segment: EmotionSegment) {
    if (segment.expression) this.expression = segment.expression;
    if (segment.animation) this.animation = segment.animation;
    if (segment.emotion) {
      this.mood = segment.emotion;
      this.moodIntensity = 0.6;
    }
    this.emit('animation-change', { animation: this.animation, expression: this.expression });
  }

  override dispose() {
    this.segments = [];
    this.pendingTriggers = [];
    super.dispose();
  }
}

export class AIDriverTrait extends CoreEventTarget {
  private context: NPCContext = {
    position: [0, 0, 0],
    active: false,
    dialogue: {
      history: [],
    },
  };

  constructor(private config: AIDriverConfig = {}) {
    super();
  }

  startAI() {
    this.context.active = true;
    this.emit('start', this.context);
  }

  stopAI() {
    this.context.active = false;
    this.emit('stop', this.context);
  }

  getContext() {
    return {
      ...this.context,
      dialogue: { ...this.context.dialogue, history: [...this.context.dialogue.history] },
    };
  }

  setPosition(position: Vec3) {
    this.context.position = position;
  }

  say(text: string) {
    this.context.dialogue.lastSaid = text;
    this.context.dialogue.history.push(text);
    this.emit('dialogue', { text });
  }

  getConfig() {
    return this.config;
  }
}

export function createShaderTrait(config: Record<string, unknown>) {
  return {
    toThreeJSConfig() {
      return {
        ...config,
        vertexShader: config.vertexShader ?? config.vertex,
        fragmentShader: config.fragmentShader ?? config.fragment ?? config.source,
        uniforms:
          typeof config.uniforms === 'object' && config.uniforms !== null ? config.uniforms : {},
      };
    },
  };
}
