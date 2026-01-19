import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Html } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';

interface WorldPlanetProps {
  position: [number, number, number];
  size: number;
  color: string;
  name: string;
  onClick: () => void;
}

export function WorldPlanet({ position, size, color, name, onClick }: WorldPlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group position={position}>
      {/* Planet */}
      <Sphere 
        ref={meshRef} 
        args={[size, 32, 32]}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.6 : 0.3}
          metalness={0.5}
          roughness={0.4}
        />
      </Sphere>
      
      {/* Glow */}
      <Sphere args={[size * 1.15, 32, 32]}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={hovered ? 0.25 : 0.12}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Label */}
      {hovered && (
        <Html distanceFactor={10}>
          <div className="bg-black/80 backdrop-blur-sm px-4 py-2 rounded-lg text-white text-sm whitespace-nowrap border pointer-events-none" style={{ borderColor: color }}>
            {name}
          </div>
        </Html>
      )}
    </group>
  );
}
