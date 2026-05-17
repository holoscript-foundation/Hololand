/**
 * CloudField - Procedural fluffy clouds for Mediterranean sky
 * Creates a field of animated volumetric-looking clouds
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Cloud } from '@react-three/drei';
import * as THREE from 'three';

// Type augmentation for R3F refs
type GroupRef = THREE.Group | null;

interface CloudFieldProps {
  count?: number;
  spread?: number;
  height?: number;
  heightVariance?: number;
  speed?: number;
  opacity?: number;
}

interface CloudInstance {
  position: [number, number, number];
  scale: number;
  speed: number;
  segments: number;
  opacity: number;
}

export default function CloudField({
  count = 12,
  spread = 100,
  height = 30,
  heightVariance = 10,
  speed = 0.2,
  opacity = 0.7,
}: CloudFieldProps) {
  const groupRef = useRef<GroupRef>(null);

  // Generate cloud instances with varied properties
  const clouds = useMemo<CloudInstance[]>(() => {
    const instances: CloudInstance[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = spread * 0.3 + Math.random() * spread * 0.7;

      instances.push({
        position: [
          Math.cos(angle) * radius + (Math.random() - 0.5) * 30,
          height + (Math.random() - 0.5) * heightVariance * 2,
          Math.sin(angle) * radius + (Math.random() - 0.5) * 30 - 20,
        ],
        scale: 0.8 + Math.random() * 1.2,
        speed: speed * (0.5 + Math.random() * 0.5),
        segments: 15 + Math.floor(Math.random() * 10),
        opacity: opacity * (0.6 + Math.random() * 0.4),
      });
    }

    return instances;
  }, [count, spread, height, heightVariance, speed, opacity]);

  return (
    <group ref={groupRef as any}>
      {clouds.map((cloud: CloudInstance, i: number) => (
        <Cloud
          key={i}
          position={cloud.position}
          speed={cloud.speed}
          opacity={cloud.opacity}
          segments={cloud.segments}
          scale={cloud.scale}
          color="#FFFFFF"
        />
      ))}
    </group>
  );
}

/**
 * Single animated cloud that drifts across the sky
 */
interface DriftingCloudProps {
  startPosition: [number, number, number];
  speed?: number;
  scale?: number;
  opacity?: number;
}

export function DriftingCloud({
  startPosition,
  speed = 2,
  scale = 1,
  opacity = 0.6,
}: DriftingCloudProps) {
  const cloudRef = useRef<GroupRef>(null);
  const positionRef = useRef(new THREE.Vector3(...startPosition));

  useFrame((_state: any, delta: number) => {
    if (!cloudRef.current) return;

    // Drift cloud slowly
    positionRef.current.x += delta * speed;

    // Reset when too far
    if (positionRef.current.x > 150) {
      positionRef.current.x = -150;
      positionRef.current.z = startPosition[2] + (Math.random() - 0.5) * 40;
    }

    cloudRef.current.position.copy(positionRef.current);
  });

  return (
    <group ref={cloudRef as any} position={startPosition}>
      <Cloud speed={0.1} opacity={opacity} segments={20} scale={scale} color="#FFFFFF" />
    </group>
  );
}

/**
 * Layered cloud system with depth
 */
export function LayeredClouds() {
  return (
    <group>
      {/* Far background clouds - slow, faded */}
      <CloudField
        count={8}
        spread={150}
        height={50}
        heightVariance={5}
        speed={0.05}
        opacity={0.4}
      />

      {/* Mid-level clouds */}
      <CloudField
        count={10}
        spread={100}
        height={35}
        heightVariance={8}
        speed={0.15}
        opacity={0.6}
      />

      {/* Near clouds - faster, more opaque */}
      <CloudField
        count={6}
        spread={60}
        height={25}
        heightVariance={5}
        speed={0.25}
        opacity={0.75}
      />

      {/* Drifting accent clouds */}
      <DriftingCloud startPosition={[-80, 28, -40]} speed={1.5} scale={1.5} opacity={0.5} />
      <DriftingCloud startPosition={[40, 32, -60]} speed={1} scale={1.2} opacity={0.55} />
      <DriftingCloud startPosition={[-20, 26, -30]} speed={2} scale={0.8} opacity={0.65} />
    </group>
  );
}
