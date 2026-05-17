/**
 * GrassGround - Animated grass terrain for Mediterranean plaza
 * Creates a lush green ground with subtle grass blade animation
 */

import { useMemo, useRef } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';

// Type augmentation for R3F refs
type MeshRef = THREE.Mesh | null;

// Grass shader material for animated blades
const GrassMaterial = shaderMaterial(
  {
    uTime: 0,
    uWindStrength: 0.3,
    uWindFrequency: 1.5,
    uGrassColor: '#7CB342',
    uGrassColorDark: '#558B2F',
    uGrassTip: '#9CCC65',
  },
  // Vertex shader
  `
    uniform float uTime;
    uniform float uWindStrength;
    uniform float uWindFrequency;

    varying vec2 vUv;
    varying float vHeight;

    void main() {
      vUv = uv;
      vHeight = position.y;

      vec3 pos = position;

      // Wind animation based on height (grass tips move more)
      float windEffect = sin(uTime * uWindFrequency + position.x * 0.5 + position.z * 0.3) * uWindStrength;
      windEffect *= smoothstep(0.0, 0.5, position.y); // More movement at top

      pos.x += windEffect * 0.1;
      pos.z += windEffect * 0.05;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // Fragment shader
  `
    uniform vec3 uGrassColor;
    uniform vec3 uGrassColorDark;
    uniform vec3 uGrassTip;

    varying vec2 vUv;
    varying float vHeight;

    void main() {
      // Gradient from dark at base to light at tips
      vec3 color = mix(uGrassColorDark, uGrassColor, vUv.y * 0.7);
      color = mix(color, uGrassTip, smoothstep(0.6, 1.0, vUv.y));

      gl_FragColor = vec4(color, 1.0);
    }
  `
);

extend({ GrassMaterial });

// TypeScript declaration
declare global {
  namespace JSX {
    interface IntrinsicElements {
      grassMaterial: any;
    }
  }
}

interface GrassGroundProps {
  size?: number;
  segments?: number;
  grassDensity?: number;
  grassHeight?: number;
  withHills?: boolean;
}

export default function GrassGround({
  size = 200,
  segments = 128,
  grassDensity = 5000,
  grassHeight = 0.3,
  withHills = true,
}: GrassGroundProps) {
  const materialRef = useRef<any>(null);

  // Animate grass
  useFrame((state: any) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
    }
  });

  return (
    <group>
      {/* Base ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[size, size, segments, segments]} />
        <meshStandardMaterial color="#7CB342" roughness={0.9} metalness={0} />
      </mesh>

      {/* Grass blade instances */}
      <instancedMesh args={[undefined, undefined, grassDensity]} receiveShadow castShadow>
        <coneGeometry args={[0.02, grassHeight, 4]} />
        <grassMaterial ref={materialRef} side={THREE.DoubleSide} />
      </instancedMesh>

      {/* Decorative grass patches */}
      <GrassPatches size={size} />

      {/* Optional hills */}
      {withHills && <RollingHills size={size} />}
    </group>
  );
}

/**
 * Scattered grass patch details
 */
function GrassPatches({ size }: { size: number }) {
  const patches = useMemo(() => {
    const result: { position: [number, number, number]; scale: number; color: string }[] = [];
    const colors = ['#7CB342', '#8BC34A', '#689F38', '#9CCC65'];

    for (let i = 0; i < 50; i++) {
      result.push({
        position: [(Math.random() - 0.5) * size * 0.8, 0.01, (Math.random() - 0.5) * size * 0.8],
        scale: 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    return result;
  }, [size]);

  return (
    <group>
      {patches.map(
        (
          patch: { position: [number, number, number]; scale: number; color: string },
          i: number
        ) => (
          <mesh
            key={i}
            position={patch.position}
            rotation={[-Math.PI / 2, 0, Math.random() * Math.PI]}
            scale={patch.scale}
          >
            <circleGeometry args={[1, 8]} />
            <meshStandardMaterial color={patch.color} roughness={0.95} transparent opacity={0.8} />
          </mesh>
        )
      )}
    </group>
  );
}

/**
 * Gentle rolling hills in the distance
 */
function RollingHills({ size }: { size: number }) {
  const hillsRef = useRef<MeshRef>(null);

  // Create hill geometry with noise
  const hillGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(size * 1.5, size * 0.5, 64, 32);
    const positions = geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];

      // Create smooth hills
      const height = Math.sin(x * 0.02) * 8 + Math.sin(x * 0.05 + 1) * 4 + Math.cos(y * 0.03) * 3;

      positions[i + 2] = Math.max(0, height);
    }

    geometry.computeVertexNormals();
    return geometry;
  }, [size]);

  return (
    <group position={[0, 0, -size * 0.45]}>
      <mesh
        ref={hillsRef as any}
        geometry={hillGeometry as any}
        rotation={[-Math.PI / 2.5, 0, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#558B2F" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/**
 * Simple grass ground without advanced shaders (fallback)
 */
export function SimpleGrassGround({ size = 200 }: { size?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color="#7CB342" roughness={0.9} />
    </mesh>
  );
}
