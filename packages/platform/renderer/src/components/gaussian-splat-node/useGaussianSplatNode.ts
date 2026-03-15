/**
 * useGaussianSplatNode Hook
 *
 * React hook that manages the full lifecycle of a Gaussian splat scene
 * within an R3F scene graph. Bridges HoloScript's @gaussian_splat trait
 * to the HoloLand volumetric rendering pipeline.
 *
 * Lifecycle:
 * 1. Detect format from URL/config
 * 2. Stream-fetch and parse (PLY/SPLAT/SPZ via GaussianSplatLoader)
 * 3. Build octree LOD structure (GaussianSplatLODManager)
 * 4. Create instanced geometry + shader material
 * 5. Per-frame LOD update driven by R3F useFrame()
 * 6. Budget enforcement based on platform (Quest 3: 180K, Desktop: 500K)
 * 7. Cleanup on unmount
 *
 * Research references:
 *   W.031 - SPZ compression (90% size reduction)
 *   W.032 - Octree-GS LOD (anchor-based level selection)
 *   W.034 - VR Gaussian budget (~180K total on Quest 3)
 *   G.030.02 - PLY stride detection fix
 *   G.030.06 - Memory pre-check
 *
 * @module gaussian-splat-node/useGaussianSplatNode
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type {
  GaussianSplatNodeConfig,
  GaussianSplatNodeState,
  LODUpdateEvent,
  LoadingProgressEvent,
  LoadingPhase,
  GaussianPlatform,
} from './types';
import {
  DEFAULT_GAUSSIAN_SPLAT_NODE_STATE,
  PLATFORM_BUDGETS,
  PLATFORM_MEMORY_MB,
  PLATFORM_MAX_SPLATS,
} from './types';

// =============================================================================
// HOOK CONFIGURATION
// =============================================================================

export interface UseGaussianSplatNodeConfig {
  /** The gaussian splat configuration */
  config: GaussianSplatNodeConfig;

  /** Callback when loading completes */
  onLoaded?: (splatCount: number) => void;

  /** Callback when a loading error occurs */
  onError?: (error: string) => void;

  /** Callback for LOD change events */
  onLODChange?: (event: LODUpdateEvent) => void;

  /** Callback for loading progress */
  onProgress?: (event: LoadingProgressEvent) => void;

  /** Callback when budget is exceeded */
  onBudgetExceeded?: (event: LODUpdateEvent) => void;
}

// =============================================================================
// HOOK RESULT
// =============================================================================

export interface GaussianSplatNodeResult {
  /** Current node state */
  state: GaussianSplatNodeState;

  /** Loaded splat data arrays (null until loaded) */
  splatData: SplatDataRef | null;

  /** Resolved platform configuration */
  platformConfig: ResolvedPlatformConfig;

  /** Per-frame LOD update function (call from useFrame) */
  updateLOD: (
    cameraX: number,
    cameraY: number,
    cameraZ: number,
    avatarCount?: number,
  ) => LODUpdateResult | null;

  /** Set the active avatar count for budget calculation */
  setActiveAvatars: (count: number) => void;

  /** Set VR mode flag */
  setVRMode: (enabled: boolean) => void;

  /** Force reload the splat data */
  reload: () => void;

  /** Dispose all resources */
  dispose: () => void;
}

/** Splat data reference (parallel arrays) */
export interface SplatDataRef {
  positions: Float32Array;
  scales: Float32Array;
  rotations: Float32Array;
  colors: Float32Array;
  opacities: Float32Array;
  count: number;
  boundsMin: [number, number, number];
  boundsMax: [number, number, number];
  center: [number, number, number];
}

/** Resolved platform configuration */
export interface ResolvedPlatformConfig {
  platform: GaussianPlatform;
  gaussianBudget: number;
  maxSplats: number;
  maxMemoryMB: number;
  isVR: boolean;
  perAvatarReservation: number;
  maxAvatars: number;
}

/** LOD update result from per-frame update */
export interface LODUpdateResult {
  changed: boolean;
  visibleCount: number;
  activeLODLevel: number;
  totalLODLevels: number;
  budgetCapped: boolean;
  levelsDropped: number;
  cameraDistance: number;
  availableBudget: number;
}

// =============================================================================
// LOD MANAGER (Inline to avoid import issues across monorepo boundaries)
// =============================================================================

/**
 * Lightweight LOD manager embedded in the hook.
 * Mirrors the GaussianSplatLODManager from volumetric-bridge but operates
 * independently for the R3F scene graph context.
 */
class InlineLODManager {
  private maxDepth: number;
  private powerLawExponent: number;
  private baseDistance: number;
  private maxDistance: number;
  private gaussianBudget: number;
  private perAvatarReservation: number;
  private maxAvatars: number;
  private movementThreshold: number;

  private thresholds: number[] = [];
  private gaussiansByLevel: Map<number, number> = new Map();
  private indexRangesByLevel: Map<number, Array<{ start: number; count: number }>> = new Map();
  private sceneCX = 0;
  private sceneCY = 0;
  private sceneCZ = 0;
  private totalCount = 0;
  private isBuilt = false;

  private lastCameraX = NaN;
  private lastCameraY = NaN;
  private lastCameraZ = NaN;
  private lastActiveLODLevel = -1;
  private activeAvatars = 0;

  constructor(config: {
    maxDepth?: number;
    powerLawExponent?: number;
    baseDistance?: number;
    maxDistance?: number;
    gaussianBudget?: number;
    perAvatarReservation?: number;
    maxAvatars?: number;
    movementThreshold?: number;
  }) {
    this.maxDepth = config.maxDepth ?? 6;
    this.powerLawExponent = config.powerLawExponent ?? 1.5;
    this.baseDistance = config.baseDistance ?? 2.0;
    this.maxDistance = config.maxDistance ?? 200.0;
    this.gaussianBudget = config.gaussianBudget ?? 0;
    this.perAvatarReservation = config.perAvatarReservation ?? 60000;
    this.maxAvatars = config.maxAvatars ?? 3;
    this.movementThreshold = config.movementThreshold ?? 0.5;
    this.computeThresholds();
  }

  buildFromSplatData(
    positions: Float32Array,
    scales: Float32Array,
    count: number,
  ): void {
    const maxDepth = this.maxDepth;

    // Compute bounds and max scale
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let maxScale = 0;

    const scaleStride = scales.length === count ? 1 : 3;

    for (let i = 0; i < count; i++) {
      const px = positions[i * 3];
      const py = positions[i * 3 + 1];
      const pz = positions[i * 3 + 2];
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (pz < minZ) minZ = pz;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
      if (pz > maxZ) maxZ = pz;

      let s: number;
      if (scaleStride === 1) {
        s = scales[i];
      } else {
        s = Math.max(scales[i * 3], scales[i * 3 + 1], scales[i * 3 + 2]);
      }
      if (s > maxScale) maxScale = s;
    }

    this.sceneCX = (minX + maxX) / 2;
    this.sceneCY = (minY + maxY) / 2;
    this.sceneCZ = (minZ + maxZ) / 2;

    // Assign LOD levels and count per level
    this.gaussiansByLevel = new Map();
    this.indexRangesByLevel = new Map();
    for (let level = 0; level < maxDepth; level++) {
      this.gaussiansByLevel.set(level, 0);
      this.indexRangesByLevel.set(level, []);
    }

    // Track contiguous ranges per level for efficient index building
    let currentLevel = -1;
    let rangeStart = 0;

    for (let i = 0; i < count; i++) {
      let s: number;
      if (scaleStride === 1) {
        s = scales[i];
      } else {
        s = Math.max(scales[i * 3], scales[i * 3 + 1], scales[i * 3 + 2]);
      }

      let level: number;
      if (s <= 0 || maxScale <= 0) {
        level = maxDepth - 1;
      } else if (s >= maxScale) {
        level = 0;
      } else {
        const ratio = maxScale / s;
        level = Math.min(Math.floor(Math.log2(ratio)), maxDepth - 1);
      }

      this.gaussiansByLevel.set(level, (this.gaussiansByLevel.get(level) ?? 0) + 1);

      if (level !== currentLevel) {
        if (currentLevel >= 0 && i > rangeStart) {
          this.indexRangesByLevel.get(currentLevel)!.push({ start: rangeStart, count: i - rangeStart });
        }
        currentLevel = level;
        rangeStart = i;
      }
    }
    // Push final range
    if (currentLevel >= 0 && count > rangeStart) {
      this.indexRangesByLevel.get(currentLevel)!.push({ start: rangeStart, count: count - rangeStart });
    }

    this.totalCount = count;
    this.isBuilt = true;
    this.lastCameraX = NaN;
    this.lastActiveLODLevel = -1;
  }

  update(
    cameraX: number,
    cameraY: number,
    cameraZ: number,
    avatarCount?: number,
  ): LODUpdateResult {
    if (!this.isBuilt) {
      return {
        changed: false,
        visibleCount: 0,
        activeLODLevel: 0,
        totalLODLevels: this.maxDepth,
        budgetCapped: false,
        levelsDropped: 0,
        cameraDistance: 0,
        availableBudget: this.gaussianBudget,
      };
    }

    // Movement threshold check
    const dx = cameraX - this.lastCameraX;
    const dy = cameraY - this.lastCameraY;
    const dz = cameraZ - this.lastCameraZ;
    const forced = isNaN(this.lastCameraX);
    const moved = forced || Math.sqrt(dx * dx + dy * dy + dz * dz) > this.movementThreshold;

    if (!moved) {
      const cdx = cameraX - this.sceneCX;
      const cdy = cameraY - this.sceneCY;
      const cdz = cameraZ - this.sceneCZ;
      return {
        changed: false,
        visibleCount: this.countVisibleSplats(this.lastActiveLODLevel),
        activeLODLevel: this.lastActiveLODLevel,
        totalLODLevels: this.maxDepth,
        budgetCapped: false,
        levelsDropped: 0,
        cameraDistance: Math.sqrt(cdx * cdx + cdy * cdy + cdz * cdz),
        availableBudget: this.getAvailableBudget(avatarCount),
      };
    }

    this.lastCameraX = cameraX;
    this.lastCameraY = cameraY;
    this.lastCameraZ = cameraZ;

    // Distance to scene center
    const cdx = cameraX - this.sceneCX;
    const cdy = cameraY - this.sceneCY;
    const cdz = cameraZ - this.sceneCZ;
    const cameraDistance = Math.sqrt(cdx * cdx + cdy * cdy + cdz * cdz);

    // Determine deepest visible LOD level
    let deepestLevel = 0;
    for (let i = 0; i < this.thresholds.length; i++) {
      if (cameraDistance < this.thresholds[i]) {
        deepestLevel = i + 1;
      } else {
        break;
      }
    }
    deepestLevel = Math.min(deepestLevel, this.maxDepth - 1);

    // Sum selected levels
    let totalSelected = 0;
    const selectedLevels: number[] = [];
    for (let l = 0; l <= deepestLevel; l++) {
      selectedLevels.push(l);
      totalSelected += this.gaussiansByLevel.get(l) ?? 0;
    }

    // Budget enforcement
    const availableBudget = this.getAvailableBudget(avatarCount);
    let budgetCapped = false;
    let levelsDropped = 0;

    if (availableBudget > 0 && totalSelected > availableBudget) {
      budgetCapped = true;
      while (selectedLevels.length > 1 && totalSelected > availableBudget) {
        const dropped = selectedLevels.pop()!;
        totalSelected -= this.gaussiansByLevel.get(dropped) ?? 0;
        levelsDropped++;
      }
    }

    const activeLODLevel = selectedLevels.length > 0 ? selectedLevels[selectedLevels.length - 1] : 0;
    const changed = forced || activeLODLevel !== this.lastActiveLODLevel;
    this.lastActiveLODLevel = activeLODLevel;

    return {
      changed,
      visibleCount: totalSelected,
      activeLODLevel,
      totalLODLevels: this.maxDepth,
      budgetCapped,
      levelsDropped,
      cameraDistance,
      availableBudget,
    };
  }

  setActiveAvatars(count: number): void {
    this.activeAvatars = Math.min(Math.max(0, count), this.maxAvatars);
  }

  getActiveAvatars(): number {
    return this.activeAvatars;
  }

  getSceneCenter(): [number, number, number] {
    return [this.sceneCX, this.sceneCY, this.sceneCZ];
  }

  getTotalCount(): number {
    return this.totalCount;
  }

  getIsBuilt(): boolean {
    return this.isBuilt;
  }

  getLevelDistribution(): Array<{ level: number; gaussianCount: number }> {
    const result: Array<{ level: number; gaussianCount: number }> = [];
    for (let level = 0; level < this.maxDepth; level++) {
      result.push({
        level,
        gaussianCount: this.gaussiansByLevel.get(level) ?? 0,
      });
    }
    return result;
  }

  clear(): void {
    this.gaussiansByLevel = new Map();
    this.indexRangesByLevel = new Map();
    this.totalCount = 0;
    this.isBuilt = false;
    this.lastCameraX = NaN;
    this.lastActiveLODLevel = -1;
  }

  private countVisibleSplats(upToLevel: number): number {
    let count = 0;
    for (let l = 0; l <= upToLevel; l++) {
      count += this.gaussiansByLevel.get(l) ?? 0;
    }
    return count;
  }

  private getAvailableBudget(avatarOverride?: number): number {
    if (this.gaussianBudget <= 0) return 0;
    const avatars = Math.min(avatarOverride ?? this.activeAvatars, this.maxAvatars);
    const reserved = avatars * this.perAvatarReservation;
    return Math.max(0, this.gaussianBudget - reserved);
  }

  private computeThresholds(): void {
    this.thresholds = [];
    for (let i = 0; i < this.maxDepth; i++) {
      const t = (i + 1) / this.maxDepth;
      const threshold = this.baseDistance + (this.maxDistance - this.baseDistance) * Math.pow(t, this.powerLawExponent);
      this.thresholds.push(threshold);
    }
  }
}

// =============================================================================
// STREAMING FETCH
// =============================================================================

/**
 * Stream-fetch a URL into an ArrayBuffer using ReadableStream chunks.
 * Reports progress via callback.
 */
async function streamFetch(
  url: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const contentLength = parseInt(response.headers.get('content-length') ?? '0', 10);

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

  const result = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return result.buffer;
}

// =============================================================================
// PLY/SPLAT PARSER (Lightweight inline version)
// =============================================================================

const PLY_TYPE_SIZES: Record<string, number> = {
  char: 1, uchar: 1, int8: 1, uint8: 1,
  short: 2, ushort: 2, int16: 2, uint16: 2,
  int: 4, uint: 4, int32: 4, uint32: 4,
  float: 4, float32: 4,
  double: 8, float64: 8,
};

interface PLYProperty {
  name: string;
  type: string;
  byteSize: number;
  offset: number;
}

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
      const parts = line.split(/\s+/);
      if (parts[1] === 'list') continue;
      const typeName = parts[1];
      const propName = parts[2];
      const byteSize = PLY_TYPE_SIZES[typeName] ?? 4;
      properties.push({ name: propName, type: typeName, byteSize, offset: byteOffset });
      byteOffset += byteSize;
    }
  }

  return {
    vertexCount,
    properties,
    stride: byteOffset,
    propertyMap: new Map(properties.map((p) => [p.name, p])),
  };
}

function readPropertyFloat(view: DataView, vertexBase: number, prop: PLYProperty): number {
  const off = vertexBase + prop.offset;
  switch (prop.type) {
    case 'float': case 'float32': return view.getFloat32(off, true);
    case 'double': case 'float64': return view.getFloat64(off, true);
    case 'uchar': case 'uint8': return view.getUint8(off) / 255;
    case 'char': case 'int8': return view.getInt8(off) / 127;
    case 'short': case 'int16': return view.getInt16(off, true);
    case 'ushort': case 'uint16': return view.getUint16(off, true);
    case 'int': case 'int32': return view.getInt32(off, true);
    case 'uint': case 'uint32': return view.getUint32(off, true);
    default: return view.getFloat32(off, true);
  }
}

function parsePLY(buffer: ArrayBuffer, maxSplats: number): SplatDataRef {
  const headerSlice = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 16384));
  const text = new TextDecoder().decode(headerSlice);
  const headerEndIdx = text.indexOf('end_header');
  if (headerEndIdx < 0) throw new Error('Invalid PLY: no end_header');

  const headerText = text.slice(0, headerEndIdx);
  const { vertexCount, stride, propertyMap } = parsePLYHeader(headerText);
  const count = Math.min(vertexCount, maxSplats);

  // Locate data start
  const headerBytes = new TextEncoder().encode(text.slice(0, headerEndIdx + 'end_header'.length)).length;
  let dataOffset = headerBytes;
  const rawView = new Uint8Array(buffer);
  while (dataOffset < rawView.length && (rawView[dataOffset] === 10 || rawView[dataOffset] === 13)) {
    dataOffset++;
  }

  const view = new DataView(buffer, dataOffset);

  // Resolve properties
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

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxXV = -Infinity, maxYV = -Infinity, maxZV = -Infinity;

  for (let i = 0; i < count; i++) {
    const base = i * stride;

    // Position
    if (propX && propY && propZ) {
      const x = readPropertyFloat(view, base, propX);
      const y = readPropertyFloat(view, base, propY);
      const z = readPropertyFloat(view, base, propZ);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (x > maxXV) maxXV = x;
      if (y > maxYV) maxYV = y;
      if (z > maxZV) maxZV = z;
    }

    // Color
    if (hasSHColor) {
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
      rotations[i * 4 + 3] = 1;
    }
  }

  return {
    positions,
    scales,
    rotations,
    colors,
    opacities,
    count,
    boundsMin: [minX, minY, minZ],
    boundsMax: [maxXV, maxYV, maxZV],
    center: [(minX + maxXV) / 2, (minY + maxYV) / 2, (minZ + maxZV) / 2],
  };
}

// =============================================================================
// FORMAT DETECTION
// =============================================================================

function detectFormat(url: string): string {
  const clean = url.split(/[?#]/)[0];
  const ext = clean.split('.').pop()?.toLowerCase() ?? 'ply';
  const knownFormats = ['ply', 'splat', 'spz', 'ksplat'];
  return knownFormats.includes(ext) ? ext : 'ply';
}

function isGzipped(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 2) return false;
  const bytes = new Uint8Array(buffer, 0, 2);
  return bytes[0] === 0x1F && bytes[1] === 0x8B;
}

// =============================================================================
// MEMORY ESTIMATION
// =============================================================================

function estimateMemoryMB(splatCount: number): number {
  const bytesPerSplat = (3 + 3 + 4 + 4 + 1) * 4; // 60 bytes
  return (splatCount * bytesPerSplat) / (1024 * 1024);
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * React hook for managing the Gaussian splat node lifecycle.
 */
export function useGaussianSplatNode(hookConfig: UseGaussianSplatNodeConfig): GaussianSplatNodeResult {
  const { config, onLoaded, onError, onLODChange, onProgress, onBudgetExceeded } = hookConfig;

  // ─── Refs ─────────────────────────────────────────────────────────
  const lodManagerRef = useRef<InlineLODManager | null>(null);
  const isDisposedRef = useRef(false);
  const loadingRef = useRef(false);
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(0);

  // ─── State ────────────────────────────────────────────────────────
  const [state, setState] = useState<GaussianSplatNodeState>(DEFAULT_GAUSSIAN_SPLAT_NODE_STATE);
  const [splatData, setSplatData] = useState<SplatDataRef | null>(null);

  // ─── Platform Config ──────────────────────────────────────────────
  const platformConfig = useMemo((): ResolvedPlatformConfig => {
    const platform = config.platform ?? 'desktop';
    const isVR = platform === 'quest3' || platform === 'pcvr';
    return {
      platform,
      gaussianBudget: config.gaussianBudget ?? PLATFORM_BUDGETS[platform],
      maxSplats: config.maxSplats ?? PLATFORM_MAX_SPLATS[platform],
      maxMemoryMB: config.maxMemoryMB ?? PLATFORM_MEMORY_MB[platform],
      isVR,
      perAvatarReservation: config.perAvatarReservation ?? 60000,
      maxAvatars: config.maxAvatars ?? 3,
    };
  }, [config.platform, config.gaussianBudget, config.maxSplats, config.maxMemoryMB, config.perAvatarReservation, config.maxAvatars]);

  // ─── Set Phase Helper ─────────────────────────────────────────────
  const setPhase = useCallback((phase: LoadingPhase, progress = 0, error: string | null = null) => {
    setState(prev => ({
      ...prev,
      phase,
      progress,
      error,
    }));
    onProgress?.({
      phase,
      progress,
      loaded: progress,
      total: 1,
    });
  }, [onProgress]);

  // ─── Load Splat Data ──────────────────────────────────────────────
  const loadSplatData = useCallback(async () => {
    if (isDisposedRef.current || loadingRef.current || !config.url) return;
    loadingRef.current = true;

    try {
      // Phase 1: Download
      setPhase('downloading', 0);
      const buffer = await streamFetch(config.url, (loaded, total) => {
        const p = total > 0 ? loaded / total : 0;
        setPhase('downloading', p * 0.4);
      });

      if (isDisposedRef.current) return;

      // Phase 2: Detect format and parse
      const format = config.format ?? detectFormat(config.url);
      let data: SplatDataRef;

      if (format === 'spz' || isGzipped(buffer)) {
        setPhase('decompressing', 0.4);
        // SPZ requires @holoscript/core SpzCodec -- fall back to PLY parser
        // for now. In production, this would delegate to the codec registry.
        // For SPZ support, the GaussianSplatLoader from volumetric-bridge
        // should be used directly.
        throw new Error(
          `SPZ format loading requires @holoscript/core SpzCodec. ` +
          `Use the GaussianSplatLoader from @hololand/volumetric-bridge for SPZ support.`
        );
      } else {
        setPhase('parsing', 0.45);
        data = parsePLY(buffer, platformConfig.maxSplats);
      }

      if (isDisposedRef.current) return;

      // Phase 3: Memory pre-check
      const memoryMB = estimateMemoryMB(data.count);
      if (memoryMB > platformConfig.maxMemoryMB) {
        throw new Error(
          `Memory pre-check failed: ${data.count.toLocaleString()} splats require ` +
          `~${memoryMB.toFixed(1)} MB, exceeding ${platformConfig.platform} budget of ` +
          `${platformConfig.maxMemoryMB} MB.`
        );
      }

      // Phase 4: Build LOD
      setPhase('building-lod', 0.6);
      const lodManager = new InlineLODManager({
        maxDepth: config.lodDepth ?? 6,
        powerLawExponent: config.lodPowerLawExponent ?? 1.5,
        baseDistance: config.lodBaseDistance ?? 2.0,
        maxDistance: config.lodMaxDistance ?? 200.0,
        gaussianBudget: platformConfig.gaussianBudget,
        perAvatarReservation: platformConfig.perAvatarReservation,
        maxAvatars: platformConfig.maxAvatars,
      });
      lodManager.buildFromSplatData(data.positions, data.scales, data.count);
      lodManagerRef.current = lodManager;

      if (isDisposedRef.current) return;

      // Phase 5: Apply scale modifier
      if (config.splatScale && config.splatScale !== 1) {
        for (let i = 0; i < data.scales.length; i++) {
          data.scales[i] *= config.splatScale;
        }
      }

      // Phase 6: Filter low-opacity splats (metadata only)
      const alphaThreshold = config.alphaThreshold ?? 0.01;
      let visibleCount = 0;
      for (let i = 0; i < data.count; i++) {
        if (data.opacities[i] >= alphaThreshold) visibleCount++;
      }

      // Phase 7: Ready
      setSplatData(data);
      setState(prev => ({
        ...prev,
        phase: 'ready',
        progress: 1,
        splatCount: data.count,
        visibleSplats: visibleCount,
        lodLevel: 0,
        totalLodLevels: config.lodDepth ?? 6,
        gpuMemoryMB: memoryMB,
        error: null,
      }));

      onLoaded?.(data.count);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setPhase('error', 0, errorMsg);
      onError?.(errorMsg);
    } finally {
      loadingRef.current = false;
    }
  }, [config.url, config.format, config.splatScale, config.alphaThreshold, config.lodDepth, config.lodPowerLawExponent, config.lodBaseDistance, config.lodMaxDistance, platformConfig, setPhase, onLoaded, onError]);

  // ─── LOD Update (call from useFrame) ──────────────────────────────
  const updateLOD = useCallback((
    cameraX: number,
    cameraY: number,
    cameraZ: number,
    avatarCount?: number,
  ): LODUpdateResult | null => {
    const manager = lodManagerRef.current;
    if (!manager || !manager.getIsBuilt()) return null;

    // Frame timing
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    frameCountRef.current++;

    const result = manager.update(cameraX, cameraY, cameraZ, avatarCount);

    if (result.changed) {
      const lodEvent: LODUpdateEvent = {
        type: result.budgetCapped ? 'budget-exceeded' : 'lod-changed',
        level: result.activeLODLevel,
        totalLevels: result.totalLODLevels,
        visibleCount: result.visibleCount,
        totalCount: manager.getTotalCount(),
        cameraDistance: result.cameraDistance,
        budgetCapped: result.budgetCapped,
        levelsDropped: result.levelsDropped,
        availableBudget: result.availableBudget,
      };

      // Update React state (throttled -- only on LOD changes)
      setState(prev => ({
        ...prev,
        visibleSplats: result.visibleCount,
        lodLevel: result.activeLODLevel,
        budgetCapped: result.budgetCapped,
      }));

      if (result.budgetCapped) {
        onBudgetExceeded?.(lodEvent);
      }
      onLODChange?.(lodEvent);
    }

    // FPS calculation (every 60 frames)
    if (frameCountRef.current % 60 === 0) {
      const frameTimeMs = now - lastFrameTimeRef.current;
      const fps = 60000 / frameTimeMs;
      lastFrameTimeRef.current = now;
      setState(prev => ({
        ...prev,
        fps: Math.round(fps),
        frameTimeMs: frameTimeMs / 60,
      }));
    }

    return result;
  }, [onLODChange, onBudgetExceeded]);

  // ─── Actions ──────────────────────────────────────────────────────
  const setActiveAvatars = useCallback((count: number) => {
    const manager = lodManagerRef.current;
    if (manager) {
      manager.setActiveAvatars(count);
      setState(prev => ({ ...prev, activeAvatars: count }));
    }
  }, []);

  const setVRMode = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, isVRMode: enabled }));
  }, []);

  const dispose = useCallback(() => {
    isDisposedRef.current = true;
    lodManagerRef.current?.clear();
    lodManagerRef.current = null;
    setSplatData(null);
    setState(DEFAULT_GAUSSIAN_SPLAT_NODE_STATE);
  }, []);

  const reload = useCallback(() => {
    dispose();
    isDisposedRef.current = false;
    loadSplatData();
  }, [dispose, loadSplatData]);

  // ─── Auto-load on mount / URL change ──────────────────────────────
  useEffect(() => {
    if (config.url) {
      loadSplatData();
    }

    return () => {
      isDisposedRef.current = true;
      lodManagerRef.current?.clear();
      lodManagerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.url]);

  return {
    state,
    splatData,
    platformConfig,
    updateLOD,
    setActiveAvatars,
    setVRMode,
    reload,
    dispose,
  };
}
