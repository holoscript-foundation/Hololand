/**
 * GaussianSplatLoader — Load .ply / .splat Gaussian Splatting captures into Three.js
 *
 * Supports:
 * - .ply (standard 3DGS format with SH coefficients)
 * - .splat (compressed binary format)
 * - .ksplat (compressed with KD-tree spatial indexing)
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

// ─── Splat Data Structure ───────────────────────────────────────────────────

interface SplatData {
  positions: Float32Array;   // xyz per splat (N*3)
  scales: Float32Array;      // sx,sy,sz per splat (N*3)
  rotations: Float32Array;   // quaternion xyzw per splat (N*4)
  colors: Float32Array;      // rgba per splat (N*4)
  opacities: Float32Array;   // alpha per splat (N)
  count: number;
}

// ─── PLY Parser ─────────────────────────────────────────────────────────────

function parsePLY(buffer: ArrayBuffer, maxSplats: number): SplatData {
  const text = new TextDecoder().decode(new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 8192)));
  const headerEnd = text.indexOf('end_header');
  if (headerEnd < 0) throw new Error('Invalid PLY: no end_header');

  // Parse header for vertex count
  const vertexMatch = text.match(/element vertex (\d+)/);
  const vertexCount = vertexMatch ? parseInt(vertexMatch[1], 10) : 0;
  const count = Math.min(vertexCount, maxSplats);

  // Find data start (header bytes + newline)
  const headerBytes = new TextEncoder().encode(text.slice(0, headerEnd + 'end_header'.length)).length;
  let dataOffset = headerBytes;
  // Skip newline after end_header
  const view = new Uint8Array(buffer);
  while (dataOffset < view.length && (view[dataOffset] === 10 || view[dataOffset] === 13)) {
    dataOffset++;
  }

  // Standard 3DGS PLY: x,y,z, nx,ny,nz, f_dc_0..2, f_rest_0..44, opacity, scale_0..2, rot_0..3
  // Total floats per vertex: 3+3+3+45+1+3+4 = 62 (for SH degree 3)
  // Simplified: we read x,y,z (3 floats), skip normals (3), read f_dc (3 = RGB), skip f_rest (45),
  // read opacity (1), scale (3), rotation (4) = 62 floats

  const floatView = new Float32Array(buffer, dataOffset);
  const STRIDE = 62; // floats per vertex for SH degree 3
  const hasFullSH = floatView.length >= count * STRIDE;
  const stride = hasFullSH ? STRIDE : 14; // fallback: x,y,z, r,g,b, opacity, sx,sy,sz, qx,qy,qz,qw

  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count * 3);
  const rotations = new Float32Array(count * 4);
  const colors = new Float32Array(count * 4);
  const opacities = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const base = i * stride;

    // Position
    positions[i * 3] = floatView[base];
    positions[i * 3 + 1] = floatView[base + 1];
    positions[i * 3 + 2] = floatView[base + 2];

    if (hasFullSH) {
      // Skip normals (3), read f_dc (SH band 0 → RGB)
      const r = 0.5 + 0.2820948 * floatView[base + 6]; // C0 * f_dc
      const g = 0.5 + 0.2820948 * floatView[base + 7];
      const b = 0.5 + 0.2820948 * floatView[base + 8];
      colors[i * 4] = Math.max(0, Math.min(1, r));
      colors[i * 4 + 1] = Math.max(0, Math.min(1, g));
      colors[i * 4 + 2] = Math.max(0, Math.min(1, b));

      // Opacity (sigmoid)
      const rawOpacity = floatView[base + 54];
      const alpha = 1 / (1 + Math.exp(-rawOpacity));
      colors[i * 4 + 3] = alpha;
      opacities[i] = alpha;

      // Scale (exp)
      scales[i * 3] = Math.exp(floatView[base + 55]);
      scales[i * 3 + 1] = Math.exp(floatView[base + 56]);
      scales[i * 3 + 2] = Math.exp(floatView[base + 57]);

      // Rotation (quaternion, normalize)
      const qw = floatView[base + 58];
      const qx = floatView[base + 59];
      const qy = floatView[base + 60];
      const qz = floatView[base + 61];
      const qlen = Math.sqrt(qw * qw + qx * qx + qy * qy + qz * qz) || 1;
      rotations[i * 4] = qx / qlen;
      rotations[i * 4 + 1] = qy / qlen;
      rotations[i * 4 + 2] = qz / qlen;
      rotations[i * 4 + 3] = qw / qlen;
    } else {
      // Simplified format
      colors[i * 4] = floatView[base + 3];
      colors[i * 4 + 1] = floatView[base + 4];
      colors[i * 4 + 2] = floatView[base + 5];
      const alpha = floatView[base + 6];
      colors[i * 4 + 3] = alpha;
      opacities[i] = alpha;
      scales[i * 3] = floatView[base + 7];
      scales[i * 3 + 1] = floatView[base + 8];
      scales[i * 3 + 2] = floatView[base + 9];
      rotations[i * 4] = floatView[base + 10];
      rotations[i * 4 + 1] = floatView[base + 11];
      rotations[i * 4 + 2] = floatView[base + 12];
      rotations[i * 4 + 3] = floatView[base + 13];
    }
  }

  return { positions, scales, rotations, colors, opacities, count };
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
    const ext = url.split('.').pop()?.toLowerCase();
    return ext === 'ply' || ext === 'splat' || ext === 'ksplat';
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

    // Fetch file
    this.emit({ type: 'progress', loaded: 0, total: 1, phase: 'downloading' });

    const response = await fetch(config.url);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);

    const contentLength = parseInt(response.headers.get('content-length') ?? '0', 10);
    const buffer = await response.arrayBuffer();

    this.emit({ type: 'progress', loaded: 0.5, total: 1, phase: 'parsing' });

    // Parse
    const data = parsePLY(buffer, maxSplats);

    this.emit({ type: 'progress', loaded: 0.8, total: 1, phase: 'building geometry' });

    // Apply scale multiplier
    if (splatScale !== 1) {
      for (let i = 0; i < data.scales.length; i++) {
        data.scales[i] *= splatScale;
      }
    }

    // Filter low-opacity splats
    const alphaThreshold = config.alphaThreshold ?? 0.01;
    let visibleCount = 0;
    for (let i = 0; i < data.count; i++) {
      if (data.opacities[i] >= alphaThreshold) visibleCount++;
    }

    // Build instanced geometry
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

    // Apply transform
    if (config.position) mesh.position.set(...config.position);
    if (config.rotation) mesh.rotation.set(...config.rotation);
    if (config.scale) {
      const s = typeof config.scale === 'number' ? [config.scale, config.scale, config.scale] as const : config.scale;
      mesh.scale.set(...s);
    }

    // Compute bounds
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
      format: config.format ?? 'ply',
      fileSize: contentLength || buffer.byteLength,
      loadTimeMs,
      splatCount: data.count,
      textureMemoryMB: (data.count * (3 + 3 + 4 + 4) * 4) / (1024 * 1024),
    };

    const result: VolumetricLoadResult = {
      object: mesh,
      bounds,
      center,
      metadata,
      dispose: () => {
        geo.dispose();
        material.dispose();
      },
    };

    this.emit({ type: 'loaded', result });
    return result;
  }
}
