/**
 * HoloScript to GLB Converter
 *
 * Transforms HoloScript scene definitions into GLB/glTF format.
 *
 * Features:
 * - HoloScript node → glTF node conversion
 * - Material and texture handling
 * - Primitive mesh generation
 * - Binary GLB encoding
 *
 * @packageDocumentation
 */

import { createLogger, type HololandLogger } from '@hololand/logger';
import type { Vector3 } from '../mental/MentalWorldState';

// ============================================================================
// TYPES
// ============================================================================

export interface HoloScriptNode {
  id: string;
  type: string;
  name?: string;
  position?: Vector3;
  rotation?: Vector3;
  scale?: number | Vector3;
  color?: string;
  material?: MaterialDef;
  mesh?: MeshDef;
  children?: HoloScriptNode[];
  properties?: Record<string, unknown>;
}

export interface MaterialDef {
  type: 'pbr' | 'unlit' | 'standard';
  baseColor?: string;
  metallic?: number;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
  doubleSided?: boolean;
}

export interface MeshDef {
  type: 'primitive' | 'custom';
  primitive?: 'box' | 'sphere' | 'cylinder' | 'plane' | 'torus';
  vertices?: number[];
  indices?: number[];
  normals?: number[];
  uvs?: number[];
}

export interface GLBExportOptions {
  binary: boolean;
  compress: boolean;
  includeAnimations: boolean;
}

export interface GLTFDocument {
  asset: { version: string; generator: string };
  scenes: Array<{ name?: string; nodes: number[] }>;
  scene: number;
  nodes: Array<{
    name?: string;
    mesh?: number;
    children?: number[];
    translation?: [number, number, number];
    rotation?: [number, number, number, number];
    scale?: [number, number, number];
  }>;
  meshes: Array<{
    name?: string;
    primitives: Array<{
      attributes: Record<string, number>;
      indices?: number;
      material?: number;
      mode?: number;
    }>;
  }>;
  materials: Array<{
    name?: string;
    pbrMetallicRoughness?: {
      baseColorFactor?: [number, number, number, number];
      metallicFactor?: number;
      roughnessFactor?: number;
    };
    emissiveFactor?: [number, number, number];
    doubleSided?: boolean;
    alphaMode?: 'OPAQUE' | 'BLEND' | 'MASK';
  }>;
  accessors: Array<{
    bufferView: number;
    componentType: number;
    count: number;
    type: string;
    min?: number[];
    max?: number[];
  }>;
  bufferViews: Array<{
    buffer: number;
    byteLength: number;
    byteOffset?: number;
    target?: number;
  }>;
  buffers: Array<{ byteLength: number; uri?: string }>;
}

// ============================================================================
// HOLOSCRIPT TO GLB CONVERTER
// ============================================================================

export class HoloScriptToGLBConverter {
  private logger: HololandLogger;
  private readonly COMPONENT_TYPE_FLOAT = 5126;
  private readonly BUFFER_VIEW_TARGET_ARRAY_BUFFER = 34962;

  constructor() {
    this.logger = createLogger('HoloScriptToGLB');
    this.logger.info('Converter initialized');
  }

  /**
   * Convert HoloScript scene to GLB
   */
  async convert(rootNodes: HoloScriptNode[]): Promise<ArrayBuffer> {
    const gltf = this.buildGLTFDocument(rootNodes);
    const glb = this.encodeGLB(gltf);
    this.logger.info(`Converted ${rootNodes.length} nodes to GLB`);
    return glb;
  }

  /**
   * Convert HoloScript scene to glTF JSON
   */
  convertToGLTF(rootNodes: HoloScriptNode[]): GLTFDocument {
    return this.buildGLTFDocument(rootNodes);
  }

  private buildGLTFDocument(rootNodes: HoloScriptNode[]): GLTFDocument {
    const doc: GLTFDocument = {
      asset: { version: '2.0', generator: 'HololandSpatial 1.0' },
      scenes: [{ nodes: [] }],
      scene: 0,
      nodes: [],
      meshes: [],
      materials: [],
      accessors: [],
      bufferViews: [],
      buffers: [],
    };

    const bufferData: number[] = [];
    const materialCache = new Map<string, number>();

    for (const node of rootNodes) {
      const nodeIndex = this.processNode(node, doc, bufferData, materialCache);
      doc.scenes[0].nodes.push(nodeIndex);
    }

    if (bufferData.length > 0) {
      doc.buffers.push({ byteLength: bufferData.length * 4 });
    }

    return doc;
  }

  private processNode(
    hsNode: HoloScriptNode,
    doc: GLTFDocument,
    bufferData: number[],
    materialCache: Map<string, number>
  ): number {
    const node: GLTFDocument['nodes'][0] = {
      name: hsNode.name || hsNode.id,
    };

    if (hsNode.position) {
      node.translation = [...hsNode.position];
    }

    if (hsNode.rotation) {
      node.rotation = this.eulerToQuaternion(hsNode.rotation);
    }

    if (hsNode.scale !== undefined) {
      if (typeof hsNode.scale === 'number') {
        node.scale = [hsNode.scale, hsNode.scale, hsNode.scale];
      } else {
        node.scale = [...hsNode.scale];
      }
    }

    if (hsNode.mesh || hsNode.type) {
      let materialIndex: number | undefined;
      if (hsNode.material || hsNode.color) {
        const materialKey = this.getMaterialKey(hsNode);
        materialIndex = materialCache.get(materialKey);
        if (materialIndex === undefined) {
          materialIndex = this.createMaterial(hsNode, doc);
          materialCache.set(materialKey, materialIndex);
        }
      }

      node.mesh = this.createMesh(hsNode, doc, bufferData, materialIndex);
    }

    if (hsNode.children && hsNode.children.length > 0) {
      node.children = [];
      for (const child of hsNode.children) {
        const childIndex = this.processNode(child, doc, bufferData, materialCache);
        node.children.push(childIndex);
      }
    }

    const nodeIndex = doc.nodes.length;
    doc.nodes.push(node);
    return nodeIndex;
  }

  private getMaterialKey(hsNode: HoloScriptNode): string {
    const m = hsNode.material;
    const c = hsNode.color || '';
    if (m) {
      return `${m.type}_${m.baseColor}_${m.metallic}_${m.roughness}`;
    }
    return `color_${c}`;
  }

  private createMaterial(hsNode: HoloScriptNode, doc: GLTFDocument): number {
    const material: GLTFDocument['materials'][0] = {
      name: `material_${doc.materials.length}`,
    };

    if (hsNode.material) {
      const m = hsNode.material;
      material.pbrMetallicRoughness = {
        baseColorFactor: this.colorToRGBA(m.baseColor || hsNode.color || '#ffffff'),
        metallicFactor: m.metallic ?? 0,
        roughnessFactor: m.roughness ?? 0.5,
      };
      if (m.emissive) {
        material.emissiveFactor = this.colorToRGB(m.emissive);
      }
      material.doubleSided = m.doubleSided ?? false;
      if (m.opacity !== undefined && m.opacity < 1) {
        material.alphaMode = 'BLEND';
        if (material.pbrMetallicRoughness.baseColorFactor) {
          material.pbrMetallicRoughness.baseColorFactor[3] = m.opacity;
        }
      }
    } else if (hsNode.color) {
      material.pbrMetallicRoughness = {
        baseColorFactor: this.colorToRGBA(hsNode.color),
        metallicFactor: 0,
        roughnessFactor: 0.5,
      };
    }

    const materialIndex = doc.materials.length;
    doc.materials.push(material);
    return materialIndex;
  }

  private createMesh(
    hsNode: HoloScriptNode,
    doc: GLTFDocument,
    bufferData: number[],
    materialIndex?: number
  ): number {
    const meshData = this.generateMeshData(hsNode);

    const vertexBufferStart = bufferData.length;
    bufferData.push(...meshData.vertices);

    const bufferViewIndex = doc.bufferViews.length;
    doc.bufferViews.push({
      buffer: 0,
      byteOffset: vertexBufferStart * 4,
      byteLength: meshData.vertices.length * 4,
      target: this.BUFFER_VIEW_TARGET_ARRAY_BUFFER,
    });

    const accessorIndex = doc.accessors.length;
    doc.accessors.push({
      bufferView: bufferViewIndex,
      componentType: this.COMPONENT_TYPE_FLOAT,
      count: meshData.vertices.length / 3,
      type: 'VEC3',
      min: meshData.min,
      max: meshData.max,
    });

    const primitive: GLTFDocument['meshes'][0]['primitives'][0] = {
      attributes: { POSITION: accessorIndex },
      mode: 4, // TRIANGLES
    };

    if (materialIndex !== undefined) {
      primitive.material = materialIndex;
    }

    const meshIndex = doc.meshes.length;
    doc.meshes.push({
      name: hsNode.name || hsNode.id,
      primitives: [primitive],
    });

    return meshIndex;
  }

  private generateMeshData(hsNode: HoloScriptNode): {
    vertices: number[];
    min: number[];
    max: number[];
  } {
    const primitive = hsNode.mesh?.primitive || this.inferPrimitive(hsNode.type);

    switch (primitive) {
      case 'box':
        return this.generateBox();
      case 'sphere':
        return this.generateSphere();
      case 'cylinder':
        return this.generateCylinder();
      case 'plane':
        return this.generatePlane();
      default:
        return this.generateBox();
    }
  }

  private inferPrimitive(type: string): MeshDef['primitive'] {
    const typeMap: Record<string, MeshDef['primitive']> = {
      orb: 'sphere', sphere: 'sphere', cube: 'box', box: 'box',
      floor: 'plane', plane: 'plane', column: 'cylinder', cylinder: 'cylinder',
    };
    return typeMap[type.toLowerCase()] || 'box';
  }

  private generateBox(): { vertices: number[]; min: number[]; max: number[] } {
    const s = 0.5;
    // Simplified box - just vertices for triangles
    const vertices = [
      // Front face
      -s, -s, s, s, -s, s, s, s, s,
      -s, -s, s, s, s, s, -s, s, s,
      // Back face
      s, -s, -s, -s, -s, -s, -s, s, -s,
      s, -s, -s, -s, s, -s, s, s, -s,
      // Top face
      -s, s, s, s, s, s, s, s, -s,
      -s, s, s, s, s, -s, -s, s, -s,
      // Bottom face
      -s, -s, -s, s, -s, -s, s, -s, s,
      -s, -s, -s, s, -s, s, -s, -s, s,
      // Right face
      s, -s, s, s, -s, -s, s, s, -s,
      s, -s, s, s, s, -s, s, s, s,
      // Left face
      -s, -s, -s, -s, -s, s, -s, s, s,
      -s, -s, -s, -s, s, s, -s, s, -s,
    ];
    return { vertices, min: [-s, -s, -s], max: [s, s, s] };
  }

  private generateSphere(): { vertices: number[]; min: number[]; max: number[] } {
    const vertices: number[] = [];
    const segments = 12;

    for (let y = 0; y < segments; y++) {
      for (let x = 0; x < segments; x++) {
        const u1 = x / segments, u2 = (x + 1) / segments;
        const v1 = y / segments, v2 = (y + 1) / segments;

        const p1 = this.spherePoint(u1, v1);
        const p2 = this.spherePoint(u2, v1);
        const p3 = this.spherePoint(u2, v2);
        const p4 = this.spherePoint(u1, v2);

        vertices.push(...p1, ...p2, ...p3);
        vertices.push(...p1, ...p3, ...p4);
      }
    }

    return { vertices, min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] };
  }

  private spherePoint(u: number, v: number): [number, number, number] {
    const theta = v * Math.PI;
    const phi = u * Math.PI * 2;
    return [
      Math.sin(theta) * Math.cos(phi) * 0.5,
      Math.cos(theta) * 0.5,
      Math.sin(theta) * Math.sin(phi) * 0.5,
    ];
  }

  private generateCylinder(): { vertices: number[]; min: number[]; max: number[] } {
    const vertices: number[] = [];
    const segments = 12;
    const r = 0.5, h = 0.5;

    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1) / segments) * Math.PI * 2;
      const x1 = Math.cos(a1) * r, z1 = Math.sin(a1) * r;
      const x2 = Math.cos(a2) * r, z2 = Math.sin(a2) * r;

      // Side
      vertices.push(x1, h, z1, x2, h, z2, x2, -h, z2);
      vertices.push(x1, h, z1, x2, -h, z2, x1, -h, z1);
      // Top
      vertices.push(0, h, 0, x1, h, z1, x2, h, z2);
      // Bottom
      vertices.push(0, -h, 0, x2, -h, z2, x1, -h, z1);
    }

    return { vertices, min: [-r, -h, -r], max: [r, h, r] };
  }

  private generatePlane(): { vertices: number[]; min: number[]; max: number[] } {
    const s = 0.5;
    const vertices = [
      -s, 0, -s, s, 0, -s, s, 0, s,
      -s, 0, -s, s, 0, s, -s, 0, s,
    ];
    return { vertices, min: [-s, 0, -s], max: [s, 0, s] };
  }

  private eulerToQuaternion(euler: Vector3): [number, number, number, number] {
    const [x, y, z] = euler.map((e) => (e * Math.PI) / 180);
    const c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2);
    const s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2);
    return [
      s1 * c2 * c3 + c1 * s2 * s3,
      c1 * s2 * c3 - s1 * c2 * s3,
      c1 * c2 * s3 + s1 * s2 * c3,
      c1 * c2 * c3 - s1 * s2 * s3,
    ];
  }

  private colorToRGBA(color: string): [number, number, number, number] {
    const rgb = this.colorToRGB(color);
    return [...rgb, 1];
  }

  private colorToRGB(color: string): [number, number, number] {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    return [r, g, b];
  }

  private encodeGLB(gltf: GLTFDocument): ArrayBuffer {
    const jsonString = JSON.stringify(gltf);
    const jsonBuffer = new TextEncoder().encode(jsonString);
    const jsonPadding = (4 - (jsonBuffer.length % 4)) % 4;
    const paddedJsonLength = jsonBuffer.length + jsonPadding;
    const totalLength = 12 + 8 + paddedJsonLength;

    const glb = new ArrayBuffer(totalLength);
    const view = new DataView(glb);

    // GLB header
    view.setUint32(0, 0x46546c67, true); // 'glTF'
    view.setUint32(4, 2, true); // version 2
    view.setUint32(8, totalLength, true);

    // JSON chunk header
    view.setUint32(12, paddedJsonLength, true);
    view.setUint32(16, 0x4e4f534a, true); // 'JSON'

    // JSON data
    const uint8View = new Uint8Array(glb);
    uint8View.set(jsonBuffer, 20);

    // Padding
    for (let i = 0; i < jsonPadding; i++) {
      uint8View[20 + jsonBuffer.length + i] = 0x20;
    }

    return glb;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let _converter: HoloScriptToGLBConverter | null = null;

export function getHoloScriptToGLBConverter(): HoloScriptToGLBConverter {
  if (!_converter) {
    _converter = new HoloScriptToGLBConverter();
  }
  return _converter;
}
