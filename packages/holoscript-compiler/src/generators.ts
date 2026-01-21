/**
 * Code generators for specific HoloScript constructs
 */

import type { OrbNode } from '@hololand/core';

/**
 * Generate a standalone R3F component from an orb definition
 */
export function generateComponent(orb: OrbNode): string {
  const name = toPascalCase(orb.name);
  const props = orb.properties || {};

  const position = formatVector(props.position, [0, 0, 0]);
  const rotation = formatVector(props.rotation, [0, 0, 0]);
  const scale = formatVector(props.scale, [1, 1, 1]);

  return `
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ${name}Props {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  onClick?: () => void;
}

export function ${name}({
  position = ${position},
  rotation = ${rotation},
  scale = ${scale},
  onClick,
}: ${name}Props) {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={onClick}
    >
      ${generateGeometry(props)}
      <meshStandardMaterial color="${props.color || '#ffffff'}" />
    </mesh>
  );
}
`.trim();
}

/**
 * Generate a world wrapper component
 */
export function generateWorld(
  name: string,
  children: string[],
  config: Record<string, any> = {}
): string {
  const worldName = toPascalCase(name);
  const childImports = children.map((c) => `import { ${toPascalCase(c)} } from './${c}';`).join('\n');
  const childComponents = children.map((c) => `      <${toPascalCase(c)} />`).join('\n');

  return `
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Sky } from '@react-three/drei';
${childImports}

export function ${worldName}() {
  return (
    <Canvas
      camera={{ position: [0, 2, 5], fov: 75 }}
      shadows
    >
      <Suspense fallback={null}>
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />

        {/* Environment */}
        ${config.sky !== false ? '<Sky sunPosition={[100, 20, 100]} />' : ''}
        ${config.environment ? `<Environment preset="${config.environment}" />` : ''}

        {/* World Objects */}
        <group>
${childComponents}
        </group>

        {/* Controls */}
        <OrbitControls />
      </Suspense>
    </Canvas>
  );
}
`.trim();
}

/**
 * Generate geometry JSX based on type
 */
function generateGeometry(props: Record<string, any>): string {
  const type = props.type || 'box';
  const size = props.size || [1, 1, 1];

  const geometries: Record<string, string> = {
    box: `<boxGeometry args={[${size[0]}, ${size[1]}, ${size[2]}]} />`,
    cube: `<boxGeometry args={[${size[0]}, ${size[0]}, ${size[0]}]} />`,
    sphere: `<sphereGeometry args={[${size[0]}, 32, 32]} />`,
    cylinder: `<cylinderGeometry args={[${size[0]}, ${size[0]}, ${size[1]}, 32]} />`,
    cone: `<coneGeometry args={[${size[0]}, ${size[1]}, 32]} />`,
    torus: `<torusGeometry args={[${size[0]}, ${size[1] || 0.4}, 16, 100]} />`,
    plane: `<planeGeometry args={[${size[0]}, ${size[1]}]} />`,
    ring: `<ringGeometry args={[${size[0]}, ${size[1]}, 32]} />`,
    dodecahedron: `<dodecahedronGeometry args={[${size[0]}]} />`,
    icosahedron: `<icosahedronGeometry args={[${size[0]}]} />`,
    octahedron: `<octahedronGeometry args={[${size[0]}]} />`,
    tetrahedron: `<tetrahedronGeometry args={[${size[0]}]} />`,
  };

  return geometries[type] || geometries.box;
}

/**
 * Generate material JSX
 */
export function generateMaterial(props: Record<string, any>): string {
  const materialType = props.material?.type || 'standard';
  const color = props.color || '#ffffff';
  const opacity = props.opacity ?? 1;
  const metalness = props.material?.metalness ?? 0;
  const roughness = props.material?.roughness ?? 0.5;

  const materials: Record<string, string> = {
    standard: `<meshStandardMaterial
      color="${color}"
      opacity={${opacity}}
      transparent={${opacity < 1}}
      metalness={${metalness}}
      roughness={${roughness}}
    />`,
    basic: `<meshBasicMaterial color="${color}" opacity={${opacity}} transparent={${opacity < 1}} />`,
    phong: `<meshPhongMaterial color="${color}" opacity={${opacity}} transparent={${opacity < 1}} />`,
    lambert: `<meshLambertMaterial color="${color}" opacity={${opacity}} transparent={${opacity < 1}} />`,
    toon: `<meshToonMaterial color="${color}" />`,
    normal: `<meshNormalMaterial />`,
    wireframe: `<meshBasicMaterial color="${color}" wireframe />`,
  };

  return materials[materialType] || materials.standard;
}

/**
 * Generate physics wrapper
 */
export function generatePhysicsWrapper(
  content: string,
  physics: Record<string, any>
): string {
  const type = physics.type || 'dynamic';
  const mass = physics.mass ?? 1;
  const friction = physics.friction ?? 0.5;
  const restitution = physics.restitution ?? 0;

  return `
<RigidBody
  type="${type}"
  mass={${mass}}
  friction={${friction}}
  restitution={${restitution}}
>
  ${content}
</RigidBody>
`.trim();
}

/**
 * Generate audio component
 */
export function generateAudio(audio: Record<string, any>): string {
  const src = audio.src || '';
  const loop = audio.loop ?? false;
  const autoplay = audio.autoplay ?? false;
  const spatial = audio.spatial ?? true;
  const volume = audio.volume ?? 1;
  const distance = audio.distance ?? 10;

  if (spatial) {
    return `
<PositionalAudio
  url="${src}"
  loop={${loop}}
  autoplay={${autoplay}}
  distance={${distance}}
/>
`.trim();
  }

  return `{/* Audio: ${src} */}`;
}

// Utility functions
function toPascalCase(str: string): string {
  return str
    .replace(/[-_]([a-z])/g, (_, c) => c.toUpperCase())
    .replace(/^[a-z]/, (c) => c.toUpperCase());
}

function formatVector(value: any, defaultVal: number[]): string {
  if (!value) return `[${defaultVal.join(', ')}]`;
  if (Array.isArray(value)) return `[${value.join(', ')}]`;
  return `[${defaultVal.join(', ')}]`;
}
