/**
 * Scene Mesh Component
 *
 * Renders a generic mesh object from the scene
 * Supports all HoloScript geometry types and reactive properties
 */

import { useRef } from 'react';
import { Box, Sphere, Cylinder, Plane, Torus, Cone } from '@react-three/drei';
import type { Mesh } from 'three';
import { useReactiveBindings, useEventBindings } from '../../holoscript';
import type { SceneConfig } from '../../holoscript';

interface SceneMeshProps {
  object: any;
  scene: SceneConfig;
  debug?: boolean;
}

export function SceneMesh({ object, scene, debug = false }: SceneMeshProps) {
  const meshRef = useRef<Mesh>(null);

  // Get reactive properties
  const reactive = useReactiveBindings(object.name, scene);

  // Get event handlers
  const events = useEventBindings(object.name, scene);

  // Extract transform
  const position = object.transform.position as [number, number, number];
  const rotation = object.transform.rotation as [number, number, number];
  const scale = object.transform.scale as [number, number, number];

  // Extract material properties
  const material = reactive.material || object.material;
  const color = material.color || '#888888';
  const emissive = material.emissive || '#000000';
  const emissiveIntensity = material.emissiveIntensity || 0;
  const opacity = material.opacity !== undefined ? material.opacity : 1;
  const metalness = material.metalness !== undefined ? material.metalness : 0.5;
  const roughness = material.roughness !== undefined ? material.roughness : 0.5;

  // Extract geometry
  const geometry = object.geometry;
  const geometryType = geometry.type;
  const geometryArgs = geometry.args;

  // Common material props
  const materialProps = {
    color,
    emissive,
    emissiveIntensity,
    opacity,
    transparent: opacity < 1,
    metalness,
    roughness,
  };

  // Common mesh props
  const meshProps = {
    ref: meshRef,
    position,
    rotation,
    scale,
    onClick: (e: any) => {
      if (events.onClick) {
        e.stopPropagation();
        events.onClick({ object: object.name });
      }
    },
    receiveShadow: true,
    castShadow: true,
  };

  // Render appropriate geometry
  switch (geometryType) {
    case 'box':
      return (
        <Box {...meshProps} args={geometryArgs as [number, number, number]}>
          <meshStandardMaterial {...materialProps} />
        </Box>
      );

    case 'sphere':
      return (
        <Sphere {...meshProps} args={geometryArgs as [number, number, number]}>
          <meshStandardMaterial {...materialProps} />
        </Sphere>
      );

    case 'cylinder':
      return (
        <Cylinder {...meshProps} args={geometryArgs as [number, number, number, number]}>
          <meshStandardMaterial {...materialProps} />
        </Cylinder>
      );

    case 'plane':
      return (
        <Plane {...meshProps} args={geometryArgs as [number, number]}>
          <meshStandardMaterial {...materialProps} />
        </Plane>
      );

    case 'torus':
      return (
        <Torus {...meshProps} args={geometryArgs as [number, number, number, number]}>
          <meshStandardMaterial {...materialProps} />
        </Torus>
      );

    case 'cone':
      return (
        <Cone {...meshProps} args={geometryArgs as [number, number, number]}>
          <meshStandardMaterial {...materialProps} />
        </Cone>
      );

    default:
      // Fallback to box
      console.warn(`Unknown geometry type: ${geometryType}, using box`);
      return (
        <Box {...meshProps} args={[1, 1, 1]}>
          <meshStandardMaterial {...materialProps} />
        </Box>
      );
  }
}
