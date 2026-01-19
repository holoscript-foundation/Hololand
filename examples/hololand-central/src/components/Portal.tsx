import React, { useRef } from 'react';
import { Mesh } from 'three';
import { useFrame } from '@react-three/fiber';

interface PortalProps {
  position: [number, number, number];
  color: number;
  label: string;
  onClick?: () => void;
}

export const Portal: React.FC<PortalProps> = ({ position, color, onClick }) => {
  const meshRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);

  // Animate portal rotation and pulsing
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.05);
    }
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.PI / 2;
      ringRef.current.rotation.z += 0.02;
    }
  });

  return (
    <group position={position} onClick={onClick}>
      {/* Portal ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[2, 0.1, 16, 50]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Portal center (swirling effect) */}
      <mesh ref={meshRef}>
        <cylinderGeometry args={[1.8, 1.8, 0.1, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.6}
          side={2} // DoubleSide
        />
      </mesh>

      {/* Portal particles (stars) */}
      {[...Array(20)].map((_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const radius = 1.5 + Math.random() * 0.5;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return (
          <mesh key={i} position={[x, y, Math.random() * 0.2 - 0.1]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial
              color={0xffffff}
              emissive={0xffffff}
              emissiveIntensity={1}
            />
          </mesh>
        );
      })}

      {/* Label (3D text effect - using planes for now) */}
      <mesh position={[0, 3, 0]}>
        <planeGeometry args={[3, 0.5]} />
        <meshStandardMaterial
          color={0x000000}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Clickable area (invisible) */}
      <mesh visible={false}>
        <cylinderGeometry args={[2, 2, 5, 32]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
};
