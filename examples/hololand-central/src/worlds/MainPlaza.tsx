import React, { useRef } from 'react';
import { Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import { Portal } from '../components/Portal';
import { BrianNPC } from '../components/BrianNPC';

interface MainPlazaProps {
  onPortalClick: (worldName: string) => void;
}

export const MainPlaza: React.FC<MainPlazaProps> = ({ onPortalClick }) => {
  const platformRef = useRef<Mesh>(null);

  // Subtle platform animation
  useFrame((state) => {
    if (platformRef.current) {
      platformRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.4} />

      {/* Main directional light */}
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Secondary fill light */}
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />

      {/* Point lights for atmosphere */}
      <pointLight position={[0, 10, 0]} intensity={0.5} color={0x667eea} distance={20} />
      <pointLight position={[10, 5, 10]} intensity={0.3} color={0xf093fb} distance={15} />
      <pointLight position={[-10, 5, -10]} intensity={0.3} color={0x764ba2} distance={15} />

      {/* Ground plane with grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial
          color={0x1a1a2e}
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>

      {/* Central platform */}
      <mesh ref={platformRef} position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[15, 15, 0.5, 32]} />
        <meshStandardMaterial
          color={0x16213e}
          metalness={0.7}
          roughness={0.3}
          emissive={0x667eea}
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Platform edge glow */}
      <mesh position={[0, 0.35, 0]}>
        <torusGeometry args={[15, 0.2, 16, 50]} />
        <meshStandardMaterial
          color={0x667eea}
          emissive={0x667eea}
          emissiveIntensity={0.8}
          metalness={1}
          roughness={0}
        />
      </mesh>

      {/* Central pillar with info */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.8, 5, 32]} />
        <meshStandardMaterial
          color={0x0f3460}
          metalness={0.8}
          roughness={0.2}
          emissive={0x667eea}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Info sphere on top of pillar */}
      <mesh position={[0, 5.5, 0]} castShadow>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial
          color={0x667eea}
          emissive={0x667eea}
          emissiveIntensity={0.5}
          metalness={1}
          roughness={0}
        />
      </mesh>

      {/* Portal 1: Casino */}
      <Portal
        position={[8, 2, 0]}
        color={0x9b59b6}
        label="Casino"
        onClick={() => onPortalClick('casino')}
      />

      {/* Portal 2: Social Lounge */}
      <Portal
        position={[-8, 2, 0]}
        color={0xe91e63}
        label="Social Lounge"
        onClick={() => onPortalClick('lounge')}
      />

      {/* Portal 3: Builder Shop */}
      <Portal
        position={[0, 2, -8]}
        color={0x2ecc71}
        label="Builder Shop"
        onClick={() => onPortalClick('builder')}
      />

      {/* Portal 4: Arcade District */}
      <Portal
        position={[0, 2, 8]}
        color={0xf1c40f}
        label="Arcade District"
        onClick={() => onPortalClick('arcade')}
      />

      {/* Portal 5: Infinity Shop */}
      <Portal
        position={[6, 2, 6]}
        color={0x00bcd4}
        label="Infinity Shop"
        onClick={() => onPortalClick('infinity')}
      />

      {/* BRIAN - The Guide! */}
      <BrianNPC
        position={[3, 0, 3]}
        variant="flexing"
        persona="guide"
        scale={1.5}
      />

      {/* Decorative floating cubes */}
      {[...Array(12)].map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const radius = 18;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const height = 3 + Math.sin(i) * 2;

        return (
          <mesh
            key={i}
            position={[x, height, z]}
            rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}
            castShadow
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color={0x667eea}
              emissive={0x667eea}
              emissiveIntensity={0.2}
              metalness={0.8}
              roughness={0.2}
              transparent
              opacity={0.6}
            />
          </mesh>
        );
      })}

      {/* Particle stars in background */}
      {[...Array(100)].map((_, i) => {
        const x = (Math.random() - 0.5) * 80;
        const y = Math.random() * 30 + 10;
        const z = (Math.random() - 0.5) * 80;

        return (
          <mesh key={`star-${i}`} position={[x, y, z]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial
              color={0xffffff}
              emissive={0xffffff}
              emissiveIntensity={Math.random() * 0.5 + 0.5}
            />
          </mesh>
        );
      })}

      {/* Fog effect */}
      <fog attach="fog" args={[0x0a0a0a, 30, 80]} />
    </>
  );
};
