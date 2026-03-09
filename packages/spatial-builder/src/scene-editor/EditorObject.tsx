/**
 * @hololand/spatial-builder - EditorObject
 *
 * R3F mesh component that renders a single SceneObject in the viewport.
 * Supports click-to-select, visibility toggling, and all primitive types.
 */

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { SceneObject } from './types';

export interface EditorObjectProps {
  object: SceneObject;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

/**
 * Returns the drei-compatible geometry element for a given primitive type.
 */
function PrimitiveGeometry({ type }: { type: string }) {
  switch (type) {
    case 'box':
      return <boxGeometry args={[1, 1, 1]} />;
    case 'sphere':
      return <sphereGeometry args={[0.5, 32, 32]} />;
    case 'cylinder':
      return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
    case 'cone':
      return <coneGeometry args={[0.5, 1, 32]} />;
    case 'torus':
      return <torusGeometry args={[0.4, 0.15, 16, 48]} />;
    case 'plane':
      return <planeGeometry args={[1, 1]} />;
    case 'capsule':
      return <capsuleGeometry args={[0.3, 0.5, 8, 16]} />;
    default:
      return <boxGeometry args={[1, 1, 1]} />;
  }
}

/**
 * Renders a light helper (small sphere icon) for light-type objects.
 */
function LightHelper({ object }: { object: SceneObject }) {
  const lp = object.lightProps;
  if (!lp) return null;

  const color = new THREE.Color(lp.color);

  return (
    <group>
      {/* Visual indicator sphere */}
      <mesh>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
      {/* Wireframe ring to make it obviously a light */}
      <mesh>
        <ringGeometry args={[0.2, 0.25, 16]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.5} />
      </mesh>
      {/* Actual Three.js light */}
      {lp.lightType === 'point' && (
        <pointLight
          color={color}
          intensity={lp.intensity}
          distance={lp.distance}
          decay={lp.decay}
          castShadow={lp.castShadow}
        />
      )}
      {lp.lightType === 'directional' && (
        <directionalLight
          color={color}
          intensity={lp.intensity}
          castShadow={lp.castShadow}
        />
      )}
      {lp.lightType === 'spot' && (
        <spotLight
          color={color}
          intensity={lp.intensity}
          distance={lp.distance}
          angle={lp.angle ?? Math.PI / 6}
          penumbra={lp.penumbra ?? 0.5}
          decay={lp.decay}
          castShadow={lp.castShadow}
        />
      )}
    </group>
  );
}

/**
 * EditorObject - A single object in the 3D viewport.
 *
 * Handles click-to-select and renders the correct geometry + material
 * based on the SceneObject descriptor.
 */
export const EditorObject: React.FC<EditorObjectProps> = React.memo(({
  object,
  isSelected,
  onSelect,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const materialProps = useMemo(() => ({
    color: new THREE.Color(object.material.color),
    metalness: object.material.metalness,
    roughness: object.material.roughness,
    emissive: new THREE.Color(object.material.emissive),
    emissiveIntensity: object.material.emissiveIntensity,
    opacity: object.material.opacity,
    transparent: object.material.transparent || object.material.opacity < 1,
    wireframe: object.material.wireframe,
  }), [object.material]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!object.locked) {
      onSelect(object.id);
    }
  };

  if (!object.visible) return null;

  // For lights, render the light helper
  if (object.kind === 'light') {
    return (
      <group
        position={[object.position.x, object.position.y, object.position.z]}
        rotation={[
          object.rotation.x * (Math.PI / 180),
          object.rotation.y * (Math.PI / 180),
          object.rotation.z * (Math.PI / 180),
        ]}
        onClick={handleClick}
      >
        <LightHelper object={object} />
      </group>
    );
  }

  // For primitives, render mesh with geometry + material
  return (
    <mesh
      ref={meshRef}
      position={[object.position.x, object.position.y, object.position.z]}
      rotation={[
        object.rotation.x * (Math.PI / 180),
        object.rotation.y * (Math.PI / 180),
        object.rotation.z * (Math.PI / 180),
      ]}
      scale={[object.scale.x, object.scale.y, object.scale.z]}
      onClick={handleClick}
      castShadow
      receiveShadow
    >
      <PrimitiveGeometry type={object.primitiveType ?? 'box'} />
      <meshStandardMaterial {...materialProps} />
    </mesh>
  );
});

EditorObject.displayName = 'EditorObject';
