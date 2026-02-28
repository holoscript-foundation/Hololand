/**
 * Portal Component
 *
 * Renders an interactive portal with dynamic states (locked, unlocking, unlocked)
 * Supports reactive properties and event handlers from HoloScript
 */

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Cylinder, Text } from '@react-three/drei';
import type { Mesh } from 'three';
import { useReactiveBindings, useEventBindings } from '../../holoscript';
import type { SceneConfig } from '../../holoscript';

interface PortalProps {
  object: any;
  scene: SceneConfig;
  debug?: boolean;
}

export function Portal({ object, scene, debug = false }: PortalProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Get reactive properties (material, state, etc.)
  const reactive = useReactiveBindings(object.name, scene);

  // Get event handlers
  const events = useEventBindings(object.name, scene);

  // Animation
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const material = reactive.material || object.material;
    const portalState = reactive.state || 'locked';

    // Pulse animation for unlocking state
    if (portalState === 'unlocking') {
      const pulseSpeed = 2;
      const pulseIntensity = 0.3 + Math.sin(state.clock.elapsedTime * pulseSpeed) * 0.2;

      if (meshRef.current.material && 'emissiveIntensity' in meshRef.current.material) {
        (meshRef.current.material as any).emissiveIntensity = pulseIntensity;
      }
    }

    // Gentle rotation for unlocked state
    if (portalState === 'unlocked') {
      meshRef.current.rotation.y += delta * 0.2;
    }

    // Hover effect
    if (hovered && portalState !== 'locked') {
      const hoverScale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
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
  const portalState = reactive.state || 'locked';

  // Compute final material properties
  const color = material.color || '#888888';
  const emissive = material.emissive || color;
  const emissiveIntensity = material.emissiveIntensity || 0;
  const opacity = material.opacity !== undefined ? material.opacity : 1;

  // Portal-specific rendering
  const isLocked = portalState === 'locked';
  const isUnlocking = portalState === 'unlocking';
  const isUnlocked = portalState === 'unlocked';

  return (
    <group position={position} rotation={rotation}>
      {/* Portal Cylinder */}
      <Cylinder
        ref={meshRef}
        args={[2, 2, 0.5, 32]} // radius, radius, height, segments
        onClick={(e) => {
          e.stopPropagation();
          if (events.onClick) {
            events.onClick({ portal: object.name, state: portalState });
          }
        }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          opacity={opacity}
          transparent={opacity < 1}
          metalness={0.5}
          roughness={0.2}
        />
      </Cylinder>

      {/* Portal Label */}
      <Text
        position={[0, 3, 0]}
        fontSize={0.5}
        color={isLocked ? '#666' : '#fff'}
        anchorX="center"
        anchorY="middle"
      >
        {object.name.replace('Portal', '')}
      </Text>

      {/* State Indicator */}
      <Text
        position={[0, 2.3, 0]}
        fontSize={0.3}
        color={isLocked ? '#888' : isUnlocking ? '#f39c12' : '#2ecc71'}
        anchorX="center"
        anchorY="middle"
      >
        {isLocked ? '🔒 Locked' : isUnlocking ? '⚡ Unlocking...' : '✨ Unlocked'}
      </Text>

      {/* Debug Info */}
      {debug && (
        <Text
          position={[0, -3, 0]}
          fontSize={0.2}
          color="#00ff00"
          anchorX="center"
          anchorY="middle"
        >
          {`State: ${portalState}\nHovered: ${hovered}`}
        </Text>
      )}
    </group>
  );
}
