/**
 * GaussianSplatNode -- R3F Component for Gaussian Splatting Scenes
 *
 * React Three Fiber component that renders Gaussian splat scenes (PLY, SPLAT,
 * SPZ formats) within an R3F scene graph. This is the CRITICAL bridge between
 * HoloScript's @gaussian_splat trait output and the rendering pipeline.
 *
 * Architecture (follows ShaderMeshNode.tsx pattern):
 * ```
 *   <GaussianSplatNode gaussianSplat={config}>
 *       |
 *       |-- useGaussianSplatNode() hook
 *       |       |-- Stream-fetch and parse (PLY/SPLAT/SPZ)
 *       |       |-- Build octree LOD structure
 *       |       |-- Memory pre-check (G.030.06)
 *       |
 *       |-- useFrame() per-frame LOD update
 *       |       |-- Camera-distance LOD selection (W.032)
 *       |       |-- Budget enforcement per platform (W.034)
 *       |       |-- instanceCount drive
 *       |
 *       |-- <mesh> (InstancedBufferGeometry + ShaderMaterial)
 *       |       |-- Instanced quad rasterization
 *       |       |-- 2D Gaussian falloff fragment shader
 *       |
 *       |-- [Optional] Debug wireframe bounds
 * ```
 *
 * Supported platforms and budgets (research: W.034):
 * - Quest 3 VR: 180,000 Gaussians at 72fps / 90fps
 * - PCVR: 500,000 Gaussians
 * - Desktop: 500,000 Gaussians (unlimited with 0)
 * - Mobile: 80,000 Gaussians
 *
 * Research references:
 *   W.031 - SPZ compression
 *   W.032 - Octree-GS LOD
 *   W.034 - VR Gaussian budget
 *   G.030.02 - PLY stride detection
 *   G.030.06 - Memory pre-check
 *
 * @module gaussian-splat-node/GaussianSplatNode
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { GaussianSplatNodeProps } from './types';
import { useGaussianSplatNode } from './useGaussianSplatNode';

// =============================================================================
// SPLAT SHADERS (Instanced Quad Gaussian Rasterization)
// =============================================================================

const SPLAT_VERTEX_SHADER = /* glsl */ `
  precision highp float;

  // Instance attributes (per-splat data)
  attribute vec3 splatPosition;
  attribute vec3 splatScale;
  attribute vec4 splatRotation;
  attribute vec4 splatColor;

  // Varyings to fragment shader
  varying vec4 vColor;
  varying vec2 vUV;

  /**
   * Convert quaternion (x,y,z,w) to 3x3 rotation matrix.
   * Follows the convention used by 3D Gaussian Splatting.
   */
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

    // Transform quad vertex by splat's rotation and scale
    mat3 rot = quatToMat3(splatRotation);
    vec3 scaled = rot * (position.xyz * splatScale);

    // World position = splat center + scaled quad offset
    vec4 worldPos = modelMatrix * vec4(splatPosition + scaled, 1.0);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const SPLAT_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  varying vec4 vColor;
  varying vec2 vUV;

  void main() {
    // 2D Gaussian falloff: exp(-0.5 * d^2 * sigma)
    // where sigma=4.0 gives a nice visual radius on the unit quad
    float d = dot(vUV, vUV);
    if (d > 1.0) discard;

    float alpha = vColor.a * exp(-0.5 * d * 4.0);
    if (alpha < 0.01) discard;

    gl_FragColor = vec4(vColor.rgb, alpha);
  }
`;

// =============================================================================
// GAUSSIAN SPLAT NODE COMPONENT
// =============================================================================

/**
 * R3F component that renders a Gaussian splat scene.
 *
 * Usage from HoloScript compiler output:
 * ```tsx
 * <GaussianSplatNode
 *   gaussianSplat={{
 *     url: '/scenes/garden.ply',
 *     platform: 'quest3',
 *     maxSplats: 180000,
 *     lodEnabled: true,
 *   }}
 *   onLoaded={(count) => console.log(`Loaded ${count} splats`)}
 *   onLODChange={(e) => console.log(`LOD: ${e.level}`)}
 * />
 * ```
 */
export const GaussianSplatNode: React.FC<GaussianSplatNodeProps> = ({
  gaussianSplat,
  nodeId,
  isSelected = false,
  onLoaded,
  onError,
  onLODChange,
  onProgress,
  onBudgetExceeded,
  showBounds = false,
  debugLOD = false,
  visible = true,
  castShadow = false,
  receiveShadow = false,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.InstancedBufferGeometry | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const { camera } = useThree();

  // ─── Hook: Lifecycle Management ───────────────────────────────────
  const {
    state,
    splatData,
    platformConfig,
    updateLOD,
  } = useGaussianSplatNode({
    config: gaussianSplat,
    onLoaded,
    onError,
    onLODChange,
    onProgress,
    onBudgetExceeded,
  });

  // ─── Build Instanced Geometry from Loaded Data ────────────────────
  const { geometry, material } = useMemo(() => {
    if (!splatData || splatData.count === 0) {
      return { geometry: null, material: null };
    }

    // Base quad geometry (instanced)
    const baseGeo = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = baseGeo.index;
    geo.attributes.position = baseGeo.attributes.position;
    geo.attributes.uv = baseGeo.attributes.uv;

    // Per-instance attributes
    geo.setAttribute(
      'splatPosition',
      new THREE.InstancedBufferAttribute(splatData.positions, 3),
    );
    geo.setAttribute(
      'splatScale',
      new THREE.InstancedBufferAttribute(splatData.scales, 3),
    );
    geo.setAttribute(
      'splatRotation',
      new THREE.InstancedBufferAttribute(splatData.rotations, 4),
    );
    geo.setAttribute(
      'splatColor',
      new THREE.InstancedBufferAttribute(splatData.colors, 4),
    );
    geo.instanceCount = splatData.count;

    geometryRef.current = geo;

    // Shader material for Gaussian splatting
    const mat = new THREE.ShaderMaterial({
      vertexShader: SPLAT_VERTEX_SHADER,
      fragmentShader: SPLAT_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    materialRef.current = mat;

    return { geometry: geo, material: mat };
  }, [splatData]);

  // ─── Transform ────────────────────────────────────────────────────
  const position = useMemo(
    () => gaussianSplat.position ?? [0, 0, 0] as [number, number, number],
    [gaussianSplat.position],
  );
  const rotation = useMemo(
    () => gaussianSplat.rotation ?? [0, 0, 0] as [number, number, number],
    [gaussianSplat.rotation],
  );
  const scale = useMemo(() => {
    const s = gaussianSplat.scale ?? 1;
    return typeof s === 'number' ? [s, s, s] as [number, number, number] : s;
  }, [gaussianSplat.scale]);

  // ─── Per-Frame LOD Update ─────────────────────────────────────────
  useFrame(() => {
    if (!splatData || state.phase !== 'ready') return;

    // Get camera world position
    const camPos = camera.position;

    // LOD update with budget enforcement
    const lodResult = updateLOD(camPos.x, camPos.y, camPos.z);

    // Drive instanceCount from LOD result
    if (lodResult && lodResult.changed && geometryRef.current) {
      geometryRef.current.instanceCount = lodResult.visibleCount;
    }
  });

  // ─── Cleanup on Unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (geometryRef.current) {
        geometryRef.current.dispose();
        geometryRef.current = null;
      }
      if (materialRef.current) {
        materialRef.current.dispose();
        materialRef.current = null;
      }
    };
  }, []);

  // ─── Render ───────────────────────────────────────────────────────
  if (!geometry || !material || state.phase !== 'ready') {
    // Show loading indicator or nothing while loading
    if (state.phase === 'error') {
      return null;
    }

    // Optional: render a placeholder while loading
    if (state.phase !== 'idle' && state.phase !== 'error') {
      return (
        <group position={position} rotation={rotation} scale={scale}>
          <mesh>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshBasicMaterial
              color="#8b5cf6"
              wireframe
              transparent
              opacity={0.3}
            />
          </mesh>
        </group>
      );
    }

    return null;
  }

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        position={position}
        rotation={rotation}
        scale={scale}
        visible={visible}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
        frustumCulled={false}
        userData={{ nodeId, gaussianSplat: true }}
      />

      {/* Selection wireframe (editor mode) */}
      {isSelected && splatData && (
        <mesh
          position={position}
          rotation={rotation}
          scale={scale}
        >
          <boxGeometry
            args={[
              splatData.boundsMax[0] - splatData.boundsMin[0],
              splatData.boundsMax[1] - splatData.boundsMin[1],
              splatData.boundsMax[2] - splatData.boundsMin[2],
            ]}
          />
          <meshBasicMaterial
            color="#3b82f6"
            wireframe
            transparent
            opacity={0.4}
          />
        </mesh>
      )}

      {/* Debug bounding box */}
      {showBounds && splatData && (
        <mesh
          position={[
            splatData.center[0],
            splatData.center[1],
            splatData.center[2],
          ]}
        >
          <boxGeometry
            args={[
              splatData.boundsMax[0] - splatData.boundsMin[0],
              splatData.boundsMax[1] - splatData.boundsMin[1],
              splatData.boundsMax[2] - splatData.boundsMin[2],
            ]}
          />
          <meshBasicMaterial
            color="#10b981"
            wireframe
            transparent
            opacity={0.2}
          />
        </mesh>
      )}
    </group>
  );
};

/**
 * Check if a node has a gaussian_splat trait that should be rendered
 * with GaussianSplatNode.
 */
export function hasGaussianSplatTrait(node: { props?: Record<string, unknown> }): boolean {
  return !!(
    node.props?.gaussianSplat &&
    typeof node.props.gaussianSplat === 'object' &&
    (node.props.gaussianSplat as Record<string, unknown>).url
  );
}

export default GaussianSplatNode;
