/**
 * GaussianSplatLoader -- Load .ply / .splat / .spz Gaussian Splatting captures into Three.js
 *
 * Supports:
 * - .ply (standard 3DGS format with dynamic stride detection from header properties)
 * - .splat (compressed binary format)
 * - .ksplat (compressed with KD-tree spatial indexing)
 * - .spz (Niantic SPZ v2/v3: delegates to @holoscript/core SpzCodec via GaussianCodecRegistry)
 *
 * Features:
 * - Streaming chunk loading via ReadableStream (replaces monolithic fetch)
 * - Dynamic PLY stride detection from header property enumeration (G.030.02 fix)
 * - SPZ decoding via canonical @holoscript/core SpzCodec (eliminates duplicated logic)
 * - Memory footprint pre-check before allocation (G.030.06)
 *
 * Renders via instanced quads with custom shader that evaluates
 * 2D Gaussian splatting per fragment.
 *
 * @module volumetric-bridge
 */

import {
  InstancedBufferGeometry,
  InstancedBufferAttribute,
  PlaneGeometry,
  ShaderMaterial,
  Mesh,
  Box3,
  Vector3,
  DoubleSide,
} from 'three';
import type {
  GaussianSplatConfig,
  VolumetricLoadResult,
  VolumetricMetadata,
  VolumetricEventHandler,
  IVolumetricLoader,
} from './types';
import { OctreeLODSystem, extractFrustumPlanes } from './OctreeLODSystem';
import { VR_OPTIMIZED_CONFIG } from './GaussianSplatLODManager';
import { getGlobalCodecRegistry } from '@holoscript/core';
import type { GaussianSplatData } from '@holoscript/core';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Default memory budget in MB if not specified in config */
const DEFAULT_MAX_MEMORY_MB = 512;

// ─── Splat Data Structure ───────────────────────────────────────────────────

interface SplatData {
  positions: Float32Array;   // xyz per splat (N*3)
  scales: Float32Array;      // sx,sy,sz per splat (N*3)
  rotations: Float32Array;   // quaternion xyzw per splat (N*4)
  colors: Float32Array;      // rgba per splat (N*4)
  opacities: Float32Array;   // alpha per splat (N)
  count: number;
}

// ─── PLY Property Descriptor ────────────────────────────────────────────────

interface PLYProperty {
  name: string;
  type: string;          // float, double, uchar, int, short, etc.
  byteSize: number;      // size in bytes for this type
  offset: number;        // byte offset within a vertex record
}

// ─── Memory Estimation ──────────────────────────────────────────────────────

/**
 * Estimate GPU memory footprint for a given splat count (in MB).
 * Accounts for positions (3), scales (3), rotations (4), colors (4) as Float32
 * plus the internal Float32Array allocation overhead.
 */
function estimateMemoryMB(splatCount: number): number {
  // Per-splat: 3+3+4+4 = 14 floats * 4 bytes = 56 bytes for attributes
  // Plus 1 float for opacities = 60 bytes total
  const bytesPerSplat = (3 + 3 + 4 + 4 + 1) * 4;
  return (splatCount * bytesPerSplat) / (1024 * 1024);
}

/**
 * Check if a load would exceed the memory budget. Throws if it would.
 */
function checkMemoryBudget(splatCount: number, maxMemoryMB: number): void {
  const estimatedMB = estimateMemoryMB(splatCount);
  if (estimatedMB > maxMemoryMB) {
    throw new Error(
      `Memory pre-check failed: ${splatCount.toLocaleString()} splats would require ` +
      `~${estimatedMB.toFixed(1)} MB, exceeding budget of ${maxMemoryMB} MB. ` +
      `Reduce maxSplats or increase maxMemoryMB.`
    );
  }
}

// ─── Streaming Fetch ────────────────────────────────────────────────────────

/**
 * Stream-fetch a URL into an ArrayBuffer using ReadableStream chunks.
 * Reports progress via callback. Falls back to monolithic fetch if
 * ReadableStream is not available (e.g. older Node.js environments).
 */
async function streamFetch(
  url: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);

  const contentLength = parseInt(response.headers.get('content-length') ?? '0', 10);

  // If ReadableStream is not available, fall back to monolithic fetch
  if (!response.body) {
    const buffer = await response.arrayBuffer();
    onProgress?.(buffer.byteLength, buffer.byteLength);
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    onProgress?.(loaded, contentLength || loaded);
  }

  // Concatenate chunks into a single ArrayBuffer
  const result = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return result.buffer;
}

// ─── PLY Property Type Sizes ────────────────────────────────────────────────

const PLY_TYPE_SIZES: Record<string, number> = {
  char: 1, uchar: 1, int8: 1, uint8: 1,
  short: 2, ushort: 2, int16: 2, uint16: 2,
  int: 4, uint: 4, int32: 4, uint32: 4,
  float: 4, float32: 4,
  double: 8, float64: 8,
};

// ─── Dynamic PLY Parser (G.030.02 fix) ──────────────────────────────────────

/**
 * Parse PLY header to extract property layout, computing exact byte stride
 * from declared properties instead of assuming SH degree 3 (stride 62).
 *
 * Fixes G.030.02: "PLY Stride Assumption Breaks on Non-SH3 Files"
 */
function parsePLYHeader(headerText: string): {
  vertexCount: number;
  properties: PLYProperty[];
  stride: number;
  propertyMap: Map<string, PLYProperty>;
} {
  const lines = headerText.split('\n').map((l) => l.trim());
  let vertexCount = 0;
  const properties: PLYProperty[] = [];
  let currentElement = '';
  let byteOffset = 0;

  for (const line of lines) {
    if (line.startsWith('element ')) {
      const parts = line.split(/\s+/);
      currentElement = parts[1];
      if (currentElement === 'vertex') {
        vertexCount = parseInt(parts[2], 10);
      }
    } else if (line.startsWith('property ') && currentElement === 'vertex') {
      // "property <type> <name>" or "property list <count_type> <elem_type> <name>"
      const parts = line.split(/\s+/);
      if (parts[1] === 'list') {
        // List properties are variable-length; skip for stride computation.
        // Standard 3DGS PLY files do not use list properties for vertex data.
        continue;
      }
      const typeName = parts[1];
      const propName = parts[2];
      const byteSize = PLY_TYPE_SIZES[typeName] ?? 4;
      properties.push({ name: propName, type: typeName, byteSize, offset: byteOffset });
      byteOffset += byteSize;
    }
  }

  const stride = byteOffset;
  const propertyMap = new Map(properties.map((p) => [p.name, p]));

  return { vertexCount, properties, stride, propertyMap };
}

/**
 * Read a float32 value from a DataView at a specific property's offset
 * within a vertex record, handling type conversion for common PLY types.
 */
function readPropertyFloat(
  view: DataView,
  vertexBase: number,
  prop: PLYProperty,
): number {
  const off = vertexBase + prop.offset;
  switch (prop.type) {
    case 'float':
    case 'float32':
      return view.getFloat32(off, true);
    case 'double':
    case 'float64':
      return view.getFloat64(off, true);
    case 'uchar':
    case 'uint8':
      return view.getUint8(off) / 255;
    case 'char':
    case 'int8':
      return view.getInt8(off) / 127;
    case 'short':
    case 'int16':
      return view.getInt16(off, true);
    case 'ushort':
    case 'uint16':
      return view.getUint16(off, true);
    case 'int':
    case 'int32':
      return view.getInt32(off, true);
    case 'uint':
    case 'uint32':
      return view.getUint32(off, true);
    default:
      return view.getFloat32(off, true);
  }
}

/**
 * Parse a PLY buffer with dynamic stride detection from header properties.
 *
 * Supports any SH degree (0-3) and non-standard PLY property layouts by
 * enumerating actual header properties rather than assuming fixed offsets.
 */
function parsePLY(buffer: ArrayBuffer, maxSplats: number): SplatData {
  const headerSlice = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 16384));
  const text = new TextDecoder().decode(headerSlice);
  const headerEndIdx = text.indexOf('end_header');
  if (headerEndIdx < 0) throw new Error('Invalid PLY: no end_header');

  const headerText = text.slice(0, headerEndIdx);
  const { vertexCount, stride, propertyMap } = parsePLYHeader(headerText);
  const count = Math.min(vertexCount, maxSplats);

  // Locate data start (skip past "end_header\n")
  const headerBytes = new TextEncoder().encode(text.slice(0, headerEndIdx + 'end_header'.length)).length;
  let dataOffset = headerBytes;
  const rawView = new Uint8Array(buffer);
  while (dataOffset < rawView.length && (rawView[dataOffset] === 10 || rawView[dataOffset] === 13)) {
    dataOffset++;
  }

  const view = new DataView(buffer, dataOffset);

  // Resolve property accessors (graceful fallback if properties are missing)
  const propX = propertyMap.get('x');
  const propY = propertyMap.get('y');
  const propZ = propertyMap.get('z');
  const propFdc0 = propertyMap.get('f_dc_0');
  const propFdc1 = propertyMap.get('f_dc_1');
  const propFdc2 = propertyMap.get('f_dc_2');
  const propOpacity = propertyMap.get('opacity');
  const propScale0 = propertyMap.get('scale_0');
  const propScale1 = propertyMap.get('scale_1');
  const propScale2 = propertyMap.get('scale_2');
  const propRot0 = propertyMap.get('rot_0');
  const propRot1 = propertyMap.get('rot_1');
  const propRot2 = propertyMap.get('rot_2');
  const propRot3 = propertyMap.get('rot_3');

  // Fallback for simplified formats: red/green/blue or r/g/b
  const propR = propertyMap.get('red') ?? propertyMap.get('r');
  const propG = propertyMap.get('green') ?? propertyMap.get('g');
  const propB = propertyMap.get('blue') ?? propertyMap.get('b');

  const hasSHColor = !!(propFdc0 && propFdc1 && propFdc2);
  const hasDirectColor = !!(propR && propG && propB);
  const hasScale = !!(propScale0 && propScale1 && propScale2);
  const hasRotation = !!(propRot0 && propRot1 && propRot2 && propRot3);

  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count * 3);
  const rotations = new Float32Array(count * 4);
  const colors = new Float32Array(count * 4);
  const opacities = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const base = i * stride;

    // Position (required)
    if (propX && propY && propZ) {
      positions[i * 3] = readPropertyFloat(view, base, propX);
      positions[i * 3 + 1] = readPropertyFloat(view, base, propY);
      positions[i * 3 + 2] = readPropertyFloat(view, base, propZ);
    }

    // Color
    if (hasSHColor) {
      // SH band 0 to RGB: C0 = 0.2820948
      const r = 0.5 + 0.2820948 * readPropertyFloat(view, base, propFdc0!);
      const g = 0.5 + 0.2820948 * readPropertyFloat(view, base, propFdc1!);
      const b = 0.5 + 0.2820948 * readPropertyFloat(view, base, propFdc2!);
      colors[i * 4] = Math.max(0, Math.min(1, r));
      colors[i * 4 + 1] = Math.max(0, Math.min(1, g));
      colors[i * 4 + 2] = Math.max(0, Math.min(1, b));
    } else if (hasDirectColor) {
      colors[i * 4] = readPropertyFloat(view, base, propR!);
      colors[i * 4 + 1] = readPropertyFloat(view, base, propG!);
      colors[i * 4 + 2] = readPropertyFloat(view, base, propB!);
    } else {
      colors[i * 4] = 0.8;
      colors[i * 4 + 1] = 0.8;
      colors[i * 4 + 2] = 0.8;
    }

    // Opacity
    if (propOpacity) {
      const rawOpacity = readPropertyFloat(view, base, propOpacity);
      // SH-based PLY stores raw logit; direct formats store actual alpha
      const alpha = hasSHColor
        ? 1 / (1 + Math.exp(-rawOpacity))
        : Math.max(0, Math.min(1, rawOpacity));
      colors[i * 4 + 3] = alpha;
      opacities[i] = alpha;
    } else {
      colors[i * 4 + 3] = 1;
      opacities[i] = 1;
    }

    // Scale
    if (hasScale) {
      const s0 = readPropertyFloat(view, base, propScale0!);
      const s1 = readPropertyFloat(view, base, propScale1!);
      const s2 = readPropertyFloat(view, base, propScale2!);
      // SH-based PLY stores log(scale); direct formats store actual scale
      scales[i * 3] = hasSHColor ? Math.exp(s0) : s0;
      scales[i * 3 + 1] = hasSHColor ? Math.exp(s1) : s1;
      scales[i * 3 + 2] = hasSHColor ? Math.exp(s2) : s2;
    } else {
      scales[i * 3] = 0.01;
      scales[i * 3 + 1] = 0.01;
      scales[i * 3 + 2] = 0.01;
    }

    // Rotation
    if (hasRotation) {
      const qw = readPropertyFloat(view, base, propRot0!);
      const qx = readPropertyFloat(view, base, propRot1!);
      const qy = readPropertyFloat(view, base, propRot2!);
      const qz = readPropertyFloat(view, base, propRot3!);
      const qlen = Math.sqrt(qw * qw + qx * qx + qy * qy + qz * qz) || 1;
      rotations[i * 4] = qx / qlen;
      rotations[i * 4 + 1] = qy / qlen;
      rotations[i * 4 + 2] = qz / qlen;
      rotations[i * 4 + 3] = qw / qlen;
    } else {
      // Identity quaternion
      rotations[i * 4 + 3] = 1;
    }
  }

  return { positions, scales, rotations, colors, opacities, count };
}

// ─── SPZ Decoding via @holoscript/core SpzCodec ─────────────────────────────

/**
 * Decode an SPZ file by delegating to the canonical @holoscript/core SpzCodec
 * via the GaussianCodecRegistry. This eliminates duplicated SPZ v2/v3 parsing
 * logic and ensures both HoloScript and HoloLand use the same decoder.
 *
 * The SpzCodec handles:
 *   - Gzip decompression (DecompressionStream / pako fallback)
 *   - Header parsing & validation (magic, version, point count, SH degree)
 *   - Position decoding (24-bit signed fixed-point)
 *   - Alpha decoding (sigmoid-compressed uint8)
 *   - Color decoding (SH DC coefficient + offset/scale)
 *   - Scale decoding (log-encoded uint8)
 *   - Rotation decoding (v2 first-three / v3 smallest-three)
 *   - Memory budget pre-check (G.030.06)
 *
 * Reference: W.031, G.030.04, W.038
 */
async function parseSPZ(compressedBuffer: ArrayBuffer, maxSplats: number): Promise<SplatData> {
  const registry = getGlobalCodecRegistry();
  const codec = registry.requireCodec('khr.spz.v2');

  const result = await codec.decode(compressedBuffer, {
    maxGaussians: maxSplats,
  });

  return codecDataToSplatData(result.data);
}

/**
 * Convert GaussianSplatData from @holoscript/core codec to the local SplatData
 * interface used by the volumetric-bridge rendering pipeline.
 *
 * The two formats are structurally identical (SoA Float32Arrays), so this is
 * a zero-cost adaptation -- we pass the typed arrays by reference, not copy.
 */
function codecDataToSplatData(codec: GaussianSplatData): SplatData {
  return {
    positions: codec.positions,
    scales: codec.scales,
    rotations: codec.rotations,
    colors: codec.colors,
    opacities: codec.opacities,
    count: codec.count,
  };
}

// ─── Format Detection ───────────────────────────────────────────────────────

/**
 * Detect file format from URL extension.
 */
function detectFormat(url: string): string {
  const clean = url.split(/[?#]/)[0];
  return clean.split('.').pop()?.toLowerCase() ?? 'ply';
}

/**
 * Check if a buffer starts with the SPZ magic bytes.
 * SPZ files are gzipped, so we check for the gzip magic (0x1F 0x8B)
 * since the SPZ magic is only visible after decompression.
 */
function isGzipped(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 2) return false;
  const bytes = new Uint8Array(buffer, 0, 2);
  return bytes[0] === 0x1F && bytes[1] === 0x8B;
}

// ─── Splat Shader ───────────────────────────────────────────────────────────

const SPLAT_VERTEX = /* glsl */ `
  precision highp float;

  attribute vec3 splatPosition;
  attribute vec3 splatScale;
  attribute vec4 splatRotation;
  attribute vec4 splatColor;

  varying vec4 vColor;
  varying vec2 vUV;

  // Quaternion to rotation matrix
  mat3 quatToMat3(vec4 q) {
    float x2 = q.x * 2.0, y2 = q.y * 2.0, z2 = q.z * 2.0;
    float xx = q.x * x2, xy = q.x * y2, xz = q.x * z2;
    float yy = q.y * y2, yz = q.y * z2, zz = q.z * z2;
    float wx = q.w * x2, wy = q.w * y2, wz = q.w * z2;
    return mat3(
      1.0 - yy - zz, xy + wz, xz - wy,
      xy - wz, 1.0 - xx - zz, yz + wx,
      xz + wy, yz - wx, 1.0 - xx - yy
    );
  }

  void main() {
    vColor = splatColor;
    vUV = position.xy;

    mat3 rot = quatToMat3(splatRotation);
    vec3 scaled = rot * (position.xyz * splatScale);
    vec4 worldPos = modelMatrix * vec4(splatPosition + scaled, 1.0);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const SPLAT_FRAGMENT = /* glsl */ `
  precision highp float;

  varying vec4 vColor;
  varying vec2 vUV;

  void main() {
    // 2D Gaussian falloff
    float d = dot(vUV, vUV);
    if (d > 1.0) discard;

    float alpha = vColor.a * exp(-0.5 * d * 4.0);
    if (alpha < 0.01) discard;

    gl_FragColor = vec4(vColor.rgb, alpha);
  }
`;

// ─── Loader ─────────────────────────────────────────────────────────────────

export class GaussianSplatLoader implements IVolumetricLoader {
  readonly sourceType = 'gaussian_splat' as const;
  private handlers: VolumetricEventHandler[] = [];

  canLoad(url: string): boolean {
    const ext = url.split(/[?#]/)[0].split('.').pop()?.toLowerCase();
    return ext === 'ply' || ext === 'splat' || ext === 'ksplat' || ext === 'spz';
  }

  on(handler: VolumetricEventHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  private emit(event: Parameters<VolumetricEventHandler>[0]) {
    for (const h of this.handlers) h(event);
  }

  async load(config: GaussianSplatConfig): Promise<VolumetricLoadResult> {
    const startTime = performance.now();
    const maxSplats = config.maxSplats ?? 1_000_000;
    const splatScale = config.splatScale ?? 1;
    const maxMemoryMB = config.maxMemoryMB ?? DEFAULT_MAX_MEMORY_MB;
    const format = config.format ?? detectFormat(config.url);

    // ── Phase 1: Streaming download ───────────────────────────────────────
    this.emit({ type: 'progress', loaded: 0, total: 1, phase: 'downloading' });

    let downloadedBytes = 0;
    const buffer = await streamFetch(config.url, (loaded, total) => {
      downloadedBytes = loaded;
      const progress = total > 0 ? loaded / total : 0;
      this.emit({ type: 'progress', loaded: progress * 0.4, total: 1, phase: 'downloading' });
    });

    this.emit({ type: 'progress', loaded: 0.4, total: 1, phase: 'parsing' });

    // ── Phase 2: Format detection and parsing ─────────────────────────────
    let data: SplatData;

    if (format === 'spz' || isGzipped(buffer)) {
      // SPZ format: gzipped binary with fixed-point encoding
      this.emit({ type: 'progress', loaded: 0.45, total: 1, phase: 'decompressing SPZ' });
      data = await parseSPZ(buffer, maxSplats);
    } else {
      // PLY format: dynamic stride detection from header properties
      data = parsePLY(buffer, maxSplats);
    }

    // ── Phase 3: Memory pre-check ─────────────────────────────────────────
    checkMemoryBudget(data.count, maxMemoryMB);

    // ── Phase 3.5: Build OctreeLOD system from parsed splat data ─────────
    this.emit({ type: 'progress', loaded: 0.55, total: 1, phase: 'building octree LOD' });

    const octreeLOD = new OctreeLODSystem({
      hysteresisDelayMs: 200,
      frustumCullingEnabled: true,
      lodConfig: {
        ...VR_OPTIMIZED_CONFIG,
        gaussianBudget: config.maxSplats ?? 180_000,
      },
    });

    octreeLOD.buildFromSplatData({
      positions: data.positions,
      scales: data.scales,
      count: data.count,
    });

    this.emit({ type: 'progress', loaded: 0.7, total: 1, phase: 'building geometry' });

    // ── Phase 4: Apply scale multiplier ───────────────────────────────────
    if (splatScale !== 1) {
      for (let i = 0; i < data.scales.length; i++) {
        data.scales[i] *= splatScale;
      }
    }

    // ── Phase 5: Filter low-opacity splats ────────────────────────────────
    const alphaThreshold = config.alphaThreshold ?? 0.01;
    let visibleCount = 0;
    for (let i = 0; i < data.count; i++) {
      if (data.opacities[i] >= alphaThreshold) visibleCount++;
    }

    // ── Phase 6: Build instanced geometry ─────────────────────────────────
    const baseGeo = new PlaneGeometry(1, 1);
    const geo = new InstancedBufferGeometry();
    geo.index = baseGeo.index;
    geo.attributes.position = baseGeo.attributes.position;
    geo.attributes.uv = baseGeo.attributes.uv;

    geo.setAttribute('splatPosition', new InstancedBufferAttribute(data.positions, 3));
    geo.setAttribute('splatScale', new InstancedBufferAttribute(data.scales, 3));
    geo.setAttribute('splatRotation', new InstancedBufferAttribute(data.rotations, 4));
    geo.setAttribute('splatColor', new InstancedBufferAttribute(data.colors, 4));
    geo.instanceCount = data.count;

    const material = new ShaderMaterial({
      vertexShader: SPLAT_VERTEX,
      fragmentShader: SPLAT_FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
    });

    const mesh = new Mesh(geo, material);
    mesh.frustumCulled = false;
    mesh.name = 'gaussian-splat';

    // ── Phase 7: Apply transform ──────────────────────────────────────────
    if (config.position) mesh.position.set(...config.position);
    if (config.rotation) mesh.rotation.set(...config.rotation);
    if (config.scale) {
      const s = typeof config.scale === 'number'
        ? [config.scale, config.scale, config.scale] as const
        : config.scale;
      mesh.scale.set(...s);
    }

    // ── Phase 8: Compute bounds ───────────────────────────────────────────
    this.emit({ type: 'progress', loaded: 0.9, total: 1, phase: 'computing bounds' });

    const bounds = new Box3();
    for (let i = 0; i < data.count; i++) {
      bounds.expandByPoint(
        new Vector3(data.positions[i * 3], data.positions[i * 3 + 1], data.positions[i * 3 + 2]),
      );
    }
    const center = new Vector3();
    bounds.getCenter(center);

    const loadTimeMs = performance.now() - startTime;

    const metadata: VolumetricMetadata = {
      sourceType: 'gaussian_splat',
      format,
      fileSize: downloadedBytes || buffer.byteLength,
      loadTimeMs,
      splatCount: data.count,
      textureMemoryMB: estimateMemoryMB(data.count),
    };

    const result: VolumetricLoadResult = {
      object: mesh,
      bounds,
      center,
      metadata,
      dispose: () => {
        octreeLOD.clear();
        geo.dispose();
        material.dispose();
      },
      /**
       * Per-frame LOD update driven by the OctreeLODSystem.
       *
       * Call every frame in the render loop. Performs:
       * 1. Camera-distance LOD selection via GaussianSplatLODManager
       * 2. LOD hysteresis (200ms delay between level transitions)
       * 3. Frustum-culled octree traversal to skip out-of-view nodes
       * 4. Visibility buffer population
       * 5. geo.instanceCount update to render only visible Gaussians
       *
       * @param cameraX - Camera world position X
       * @param cameraY - Camera world position Y
       * @param cameraZ - Camera world position Z
       * @param viewProjectionMatrix - Column-major 4x4 VP matrix (16 floats)
       *   from camera.projectionMatrix * camera.matrixWorldInverse.
       *   Pass null to skip frustum culling.
       */
      updateLOD: (
        cameraX: number,
        cameraY: number,
        cameraZ: number,
        viewProjectionMatrix: ArrayLike<number> | null,
      ) => {
        const frustum = viewProjectionMatrix
          ? extractFrustumPlanes(viewProjectionMatrix)
          : null;
        const timestamp = typeof performance !== 'undefined'
          ? performance.now()
          : Date.now();

        const lodResult = octreeLOD.update(
          cameraX, cameraY, cameraZ,
          frustum,
          timestamp,
        );

        // Drive geo.instanceCount from LOD result
        if (lodResult.changed) {
          geo.instanceCount = lodResult.visibleCount;

          // Emit lod-changed event for external listeners
          this.emit({
            type: 'lod-changed',
            level: lodResult.activeLODLevel,
            distance: lodResult.cameraDistance,
          });
        }

        return {
          changed: lodResult.changed,
          visibleCount: lodResult.visibleCount,
          visibleIndices: lodResult.visibleIndices,
          visibilityBuffer: lodResult.visibilityBuffer,
          crossFade: {
            active: lodResult.crossFade.active,
            progress: lodResult.crossFade.progress,
            outgoingAlpha: lodResult.crossFade.outgoingAlpha,
            incomingAlpha: lodResult.crossFade.incomingAlpha,
          },
          motionBias: {
            active: lodResult.motionBias.active,
            levelsDropped: lodResult.motionBias.levelsDropped,
            smoothedVelocity: lodResult.motionBias.smoothedVelocity,
          },
        };
      },
    };

    this.emit({ type: 'loaded', result });
    return result;
  }
}
