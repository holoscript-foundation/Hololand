/**
 * NPC Component
 *
 * Renders an interactive NPC with AI companion integration
 * Supports reactive properties and event handlers from HoloScript
 */

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Text } from '@react-three/drei';
import type { Mesh } from 'three';
import { useReactiveBindings, useEventBindings } from '../../holoscript';
import type { SceneConfig } from '../../holoscript';

interface NPCProps {
  object: any;
  scene: SceneConfig;
  debug?: boolean;
}

export function NPC({ object, scene, debug = false }: NPCProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [talking, setTalking] = useState(false);

  // Get reactive properties
  const reactive = useReactiveBindings(object.name, scene);

  // Get event handlers
  const events = useEventBindings(object.name, scene);

  // Animation
  useFrame((state) => {
    if (!meshRef.current) return;

    // Gentle floating animation
    const floatOffset = Math.sin(state.clock.elapsedTime * 1.5) * 0.2;
    meshRef.current.position.y = floatOffset;

    // Gentle rotation
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;

    // Hover effect
    if (hovered) {
      const hoverScale = 1.1 + Math.sin(state.clock.elapsedTime * 5) * 0.05;
      meshRef.current.scale.set(hoverScale, hoverScale, hoverScale);
    } else {
      meshRef.current.scale.set(1, 1, 1);
    }
  });

  // Extract transform
  const position = object.transform.position as [number, number, number];
  const rotation = object.transform.rotation as [number, number, number];

  // Extract material properties
  const material = reactive.material || object.material;
  const color = material.color || '#3498db';
  const emissive = material.emissive || color;
  const emissiveIntensity = material.emissiveIntensity || 0.3;

  // Extract NPC-specific properties
  const npcName = object.properties?.find((p: any) => p.key === 'name')?.value || object.name;
  const npcRole = object.properties?.find((p: any) => p.key === 'role')?.value || 'Guide';

  return (
    <group position={position} rotation={rotation}>
      {/* NPC Body (sphere) */}
      <Sphere
        ref={meshRef}
        args={[0.8, 32, 32]}
        onClick={(e) => {
          e.stopPropagation();
          setTalking(!talking);
          if (events.onClick) {
            events.onClick({ npc: object.name, talking: !talking });
          }
        }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          metalness={0.3}
          roughness={0.4}
        />
      </Sphere>

      {/* NPC Name Label */}
      <Text
        position={[0, 2, 0]}
        fontSize={0.4}
        color="#fff"
        anchorX="center"
        anchorY="middle"
      >
        {npcName}
      </Text>

      {/* NPC Role */}
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.25}
        color="#bbb"
        anchorX="center"
        anchorY="middle"
      >
        {npcRole}
      </Text>

      {/* Interaction Hint */}
      {hovered && (
        <Text
          position={[0, -1.5, 0]}
          fontSize={0.3}
          color="#f39c12"
          anchorX="center"
          anchorY="middle"
        >
          💬 Click to talk
        </Text>
      )}

      {/* Talking Indicator */}
      {talking && (
        <group position={[0, 1, 1.2]}>
          <Text
            fontSize={0.5}
            color="#fff"
            anchorX="center"
            anchorY="middle"
          >
            ...
          </Text>
        </group>
      )}

      {/* Debug Info */}
      {debug && (
        <Text
          position={[0, -2, 0]}
          fontSize={0.2}
          color="#00ff00"
          anchorX="center"
          anchorY="middle"
        >
          {`NPC: ${npcName}\nHovered: ${hovered}\nTalking: ${talking}`}
        </Text>
      )}
    </group>
  );
}
