/**
 * PlyLoader
 *
 * Parser for 3D Gaussian Splatting PLY files.
 *
 * Supports the standard 3DGS PLY format with properties:
 *   x, y, z                           - Position (float32)
 *   nx, ny, nz                        - Normal (float32, optional)
 *   f_dc_0, f_dc_1, f_dc_2           - SH DC coefficients (float32)
 *   f_rest_0 .. f_rest_44             - SH rest coefficients (float32, optional)
 *   opacity                           - Opacity, sigmoid-encoded (float32)
 *   scale_0, scale_1, scale_2         - Log-scale (float32)
 *   rot_0, rot_1, rot_2, rot_3        - Rotation quaternion (float32)
 *
 * Also supports the compressed .splat format (32 bytes per splat):
 *   position:  3x float32 (12 bytes)
 *   scale:     3x float32 (12 bytes) [already decoded]
 *   color:     4x uint8   (4 bytes)  [RGBA, already linear]
 *   rotation:  4x uint8   (4 bytes)  [compressed quaternion]
 *
 * @module gaussian-splat-viewer/PlyLoader
 */

import { logger } from '../../logger';
import type { SplatCloudData } from './types';

// =============================================================================
// PLY HEADER PARSING
// =============================================================================

interface PlyProperty {
  name: string;
  type: string;
  offset: number;
  size: number;
}

interface PlyHeader {
  vertexCount: number;
  properties: PlyProperty[];
  headerEndOffset: number;
  isBinary: boolean;
  isLittleEndian: boolean;
}

const PLY_TYPE_SIZES: Record<string, number> = {
  char: 1, uchar: 1, int8: 1, uint8: 1,
  short: 2, ushort: 2, int16: 2, uint16: 2,
  int: 4, uint: 4, int32: 4, uint32: 4,
  float: 4, float32: 4,
  double: 8, float64: 8,
};

function parsePlyHeader(text: string): PlyHeader {
  const lines = text.split('\n');
  let vertexCount = 0;
  const properties: PlyProperty[] = [];
  let isBinary = false;
  let isLittleEndian = true;
  let headerEndLine = 0;
  let currentOffset = 0;
  let inVertexElement = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === 'end_header') {
      headerEndLine = i;
      break;
    }

    if (line.startsWith('format')) {
      const parts = line.split(/\s+/);
      if (parts[1] === 'binary_little_endian') {
        isBinary = true;
        isLittleEndian = true;
      } else if (parts[1] === 'binary_big_endian') {
        isBinary = true;
        isLittleEndian = false;
      }
    }

    if (line.startsWith('element vertex')) {
      vertexCount = parseInt(line.split(/\s+/)[2], 10);
      inVertexElement = true;
    } else if (line.startsWith('element')) {
      inVertexElement = false;
    }

    if (line.startsWith('property') && inVertexElement) {
      const parts = line.split(/\s+/);
      const typeName = parts[1];
      const propName = parts[2];
      const size = PLY_TYPE_SIZES[typeName] ?? 4;

      properties.push({
        name: propName,
        type: typeName,
        offset: currentOffset,
        size,
      });
      currentOffset += size;
    }
  }

  // Compute header end offset in bytes
  let headerEndOffset = 0;
  for (let i = 0; i <= headerEndLine; i++) {
    headerEndOffset += lines[i].length + 1; // +1 for newline
  }

  return {
    vertexCount,
    properties,
    headerEndOffset,
    isBinary,
    isLittleEndian,
  };
}

// =============================================================================
// PLY DATA EXTRACTION
// =============================================================================

function getPropertyIndex(properties: PlyProperty[], name: string): number {
  return properties.findIndex(p => p.name === name);
}

function extractBinaryData(
  buffer: ArrayBuffer,
  header: PlyHeader,
): SplatCloudData {
  const { vertexCount, properties, headerEndOffset, isLittleEndian } = header;

  // Calculate stride (bytes per vertex)
  const stride = properties.reduce((sum, p) => sum + p.size, 0);

  const dataView = new DataView(buffer, headerEndOffset);

  // Allocate output arrays
  const positions = new Float32Array(vertexCount * 3);
  const shDC = new Float32Array(vertexCount * 3);
  const opacities = new Float32Array(vertexCount);
  const scales = new Float32Array(vertexCount * 3);
  const rotations = new Float32Array(vertexCount * 4);

  // Count SH rest properties
  let shRestCount = 0;
  for (const prop of properties) {
    if (prop.name.startsWith('f_rest_')) {
      shRestCount++;
    }
  }
  const shRest = shRestCount > 0 ? new Float32Array(vertexCount * shRestCount) : null;

  // Determine SH degree from rest count
  let shDegree = 0;
  if (shRestCount >= 45) shDegree = 3;
  else if (shRestCount >= 24) shDegree = 2;
  else if (shRestCount >= 9) shDegree = 1;

  // Build property lookup
  const propMap = new Map<string, PlyProperty>();
  for (const prop of properties) {
    propMap.set(prop.name, prop);
  }

  // Bounding box
  const boundsMin: [number, number, number] = [Infinity, Infinity, Infinity];
  const boundsMax: [number, number, number] = [-Infinity, -Infinity, -Infinity];

  // Read data
  for (let i = 0; i < vertexCount; i++) {
    const baseOffset = i * stride;

    // Position
    const xProp = propMap.get('x');
    const yProp = propMap.get('y');
    const zProp = propMap.get('z');
    if (xProp && yProp && zProp) {
      const x = dataView.getFloat32(baseOffset + xProp.offset, isLittleEndian);
      const y = dataView.getFloat32(baseOffset + yProp.offset, isLittleEndian);
      const z = dataView.getFloat32(baseOffset + zProp.offset, isLittleEndian);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      boundsMin[0] = Math.min(boundsMin[0], x);
      boundsMin[1] = Math.min(boundsMin[1], y);
      boundsMin[2] = Math.min(boundsMin[2], z);
      boundsMax[0] = Math.max(boundsMax[0], x);
      boundsMax[1] = Math.max(boundsMax[1], y);
      boundsMax[2] = Math.max(boundsMax[2], z);
    }

    // SH DC
    const dc0 = propMap.get('f_dc_0');
    const dc1 = propMap.get('f_dc_1');
    const dc2 = propMap.get('f_dc_2');
    if (dc0 && dc1 && dc2) {
      shDC[i * 3] = dataView.getFloat32(baseOffset + dc0.offset, isLittleEndian);
      shDC[i * 3 + 1] = dataView.getFloat32(baseOffset + dc1.offset, isLittleEndian);
      shDC[i * 3 + 2] = dataView.getFloat32(baseOffset + dc2.offset, isLittleEndian);
    }

    // SH Rest
    if (shRest) {
      for (let j = 0; j < shRestCount; j++) {
        const prop = propMap.get(`f_rest_${j}`);
        if (prop) {
          shRest[i * shRestCount + j] = dataView.getFloat32(
            baseOffset + prop.offset,
            isLittleEndian,
          );
        }
      }
    }

    // Opacity
    const opProp = propMap.get('opacity');
    if (opProp) {
      opacities[i] = dataView.getFloat32(baseOffset + opProp.offset, isLittleEndian);
    }

    // Scale
    const s0 = propMap.get('scale_0');
    const s1 = propMap.get('scale_1');
    const s2 = propMap.get('scale_2');
    if (s0 && s1 && s2) {
      scales[i * 3] = dataView.getFloat32(baseOffset + s0.offset, isLittleEndian);
      scales[i * 3 + 1] = dataView.getFloat32(baseOffset + s1.offset, isLittleEndian);
      scales[i * 3 + 2] = dataView.getFloat32(baseOffset + s2.offset, isLittleEndian);
    }

    // Rotation
    const r0 = propMap.get('rot_0');
    const r1 = propMap.get('rot_1');
    const r2 = propMap.get('rot_2');
    const r3 = propMap.get('rot_3');
    if (r0 && r1 && r2 && r3) {
      rotations[i * 4] = dataView.getFloat32(baseOffset + r0.offset, isLittleEndian);
      rotations[i * 4 + 1] = dataView.getFloat32(baseOffset + r1.offset, isLittleEndian);
      rotations[i * 4 + 2] = dataView.getFloat32(baseOffset + r2.offset, isLittleEndian);
      rotations[i * 4 + 3] = dataView.getFloat32(baseOffset + r3.offset, isLittleEndian);
    }
  }

  const center: [number, number, number] = [
    (boundsMin[0] + boundsMax[0]) / 2,
    (boundsMin[1] + boundsMax[1]) / 2,
    (boundsMin[2] + boundsMax[2]) / 2,
  ];

  return {
    count: vertexCount,
    positions,
    shDC,
    shRest,
    shDegree,
    opacities,
    scales,
    rotations,
    boundsMin,
    boundsMax,
    center,
  };
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Load a 3DGS PLY file from a URL.
 *
 * @param url - URL to the PLY file
 * @param onProgress - Optional progress callback (0-1)
 * @returns Parsed splat cloud data
 */
export async function loadPlyFromUrl(
  url: string,
  onProgress?: (progress: number) => void,
): Promise<SplatCloudData> {
  logger.info('[PlyLoader] Loading PLY', { url });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`[PlyLoader] Failed to fetch ${url}: ${response.status}`);
  }

  const contentLength = response.headers.get('content-length');
  const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

  let receivedBytes = 0;
  const chunks: Uint8Array[] = [];

  const reader = response.body?.getReader();
  if (!reader) {
    // Fallback: load entire buffer at once
    const buffer = await response.arrayBuffer();
    return parsePlyBuffer(buffer);
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    receivedBytes += value.byteLength;

    if (onProgress && totalBytes > 0) {
      onProgress(receivedBytes / totalBytes);
    }
  }

  // Combine chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return parsePlyBuffer(combined.buffer);
}

/**
 * Parse a PLY file from an ArrayBuffer.
 *
 * @param buffer - Raw PLY file data
 * @returns Parsed splat cloud data
 */
export function parsePlyBuffer(buffer: ArrayBuffer): SplatCloudData {
  // Read header as text (PLY headers are ASCII)
  const headerBytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 8192));
  const headerText = new TextDecoder().decode(headerBytes);

  if (!headerText.startsWith('ply')) {
    // Might be a .splat file (compact binary format)
    return parseSplatBuffer(buffer);
  }

  const header = parsePlyHeader(headerText);

  logger.info('[PlyLoader] Parsed PLY header', {
    vertexCount: header.vertexCount,
    propertyCount: header.properties.length,
    binary: header.isBinary,
    littleEndian: header.isLittleEndian,
  });

  if (!header.isBinary) {
    throw new Error('[PlyLoader] Only binary PLY files are supported');
  }

  return extractBinaryData(buffer, header);
}

/**
 * Parse a compact .splat file (32 bytes per splat).
 *
 * Layout per splat:
 *   [0-11]  position:  3x float32
 *   [12-23] scale:     3x float32
 *   [24-27] color:     4x uint8 (RGBA)
 *   [28-31] rotation:  4x uint8 (compressed quaternion)
 */
export function parseSplatBuffer(buffer: ArrayBuffer): SplatCloudData {
  const BYTES_PER_SPLAT = 32;
  const count = Math.floor(buffer.byteLength / BYTES_PER_SPLAT);

  logger.info('[PlyLoader] Parsing .splat format', { count });

  const dataView = new DataView(buffer);

  const positions = new Float32Array(count * 3);
  const shDC = new Float32Array(count * 3);
  const opacities = new Float32Array(count);
  const scales = new Float32Array(count * 3);
  const rotations = new Float32Array(count * 4);

  const boundsMin: [number, number, number] = [Infinity, Infinity, Infinity];
  const boundsMax: [number, number, number] = [-Infinity, -Infinity, -Infinity];

  for (let i = 0; i < count; i++) {
    const base = i * BYTES_PER_SPLAT;

    // Position
    const x = dataView.getFloat32(base, true);
    const y = dataView.getFloat32(base + 4, true);
    const z = dataView.getFloat32(base + 8, true);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    boundsMin[0] = Math.min(boundsMin[0], x);
    boundsMin[1] = Math.min(boundsMin[1], y);
    boundsMin[2] = Math.min(boundsMin[2], z);
    boundsMax[0] = Math.max(boundsMax[0], x);
    boundsMax[1] = Math.max(boundsMax[1], y);
    boundsMax[2] = Math.max(boundsMax[2], z);

    // Scale (already decoded in .splat format, convert to log-scale for consistency)
    scales[i * 3] = Math.log(Math.max(dataView.getFloat32(base + 12, true), 1e-8));
    scales[i * 3 + 1] = Math.log(Math.max(dataView.getFloat32(base + 16, true), 1e-8));
    scales[i * 3 + 2] = Math.log(Math.max(dataView.getFloat32(base + 20, true), 1e-8));

    // Color (uint8 RGBA -> SH DC coefficients)
    // Reverse the SH_C0 conversion: sh_dc = (color / 255 - 0.5) / SH_C0
    const SH_C0 = 0.28209479177387814;
    const r = dataView.getUint8(base + 24) / 255;
    const g = dataView.getUint8(base + 25) / 255;
    const b = dataView.getUint8(base + 26) / 255;
    const a = dataView.getUint8(base + 27) / 255;

    shDC[i * 3] = (r - 0.5) / SH_C0;
    shDC[i * 3 + 1] = (g - 0.5) / SH_C0;
    shDC[i * 3 + 2] = (b - 0.5) / SH_C0;

    // Opacity (convert from linear to sigmoid-encoded: logit(a))
    const clampedA = Math.max(Math.min(a, 0.999), 0.001);
    opacities[i] = Math.log(clampedA / (1 - clampedA));

    // Rotation (uint8 compressed quaternion -> float32)
    // .splat format: each component mapped from [0, 255] to [-1, 1]
    const rw = (dataView.getUint8(base + 28) - 128) / 128;
    const rx = (dataView.getUint8(base + 29) - 128) / 128;
    const ry = (dataView.getUint8(base + 30) - 128) / 128;
    const rz = (dataView.getUint8(base + 31) - 128) / 128;

    // Normalize quaternion
    const qLen = Math.sqrt(rw * rw + rx * rx + ry * ry + rz * rz);
    const qNorm = qLen > 0.0001 ? 1 / qLen : 1;
    rotations[i * 4] = rw * qNorm;
    rotations[i * 4 + 1] = rx * qNorm;
    rotations[i * 4 + 2] = ry * qNorm;
    rotations[i * 4 + 3] = rz * qNorm;
  }

  const center: [number, number, number] = [
    (boundsMin[0] + boundsMax[0]) / 2,
    (boundsMin[1] + boundsMax[1]) / 2,
    (boundsMin[2] + boundsMax[2]) / 2,
  ];

  return {
    count,
    positions,
    shDC,
    shRest: null,
    shDegree: 0,
    opacities,
    scales,
    rotations,
    boundsMin,
    boundsMax,
    center,
  };
}
