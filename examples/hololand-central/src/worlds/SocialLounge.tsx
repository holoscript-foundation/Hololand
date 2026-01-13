import React, { useRef } from 'react';
import { Mesh } from 'three';
import { useFrame } from '@react-three/fiber';

export const SocialLounge: React.FC = () => {
  const chandelier1Ref = useRef<Mesh>(null);
  const chandelier2Ref = useRef<Mesh>(null);

  // Animate chandeliers
  useFrame((state) => {
    if (chandelier1Ref.current && chandelier2Ref.current) {
      chandelier1Ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      chandelier2Ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5 + Math.PI) * 0.1;
    }
  });

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={0.5} castShadow />
      <pointLight position={[0, 5, 0]} intensity={0.8} color={0xffd700} distance={20} />
      <pointLight position={[-5, 3, -5]} intensity={0.5} color={0x667eea} distance={15} />
      <pointLight position={[5, 3, 5]} intensity={0.5} color={0xf093fb} distance={15} />

      {/* Ground - Elegant carpet */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial
          color={0x2c1810}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Central carpet pattern */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[8, 32]} />
        <meshStandardMaterial
          color={0x8b0000}
          roughness={0.8}
        />
      </mesh>

      {/* Room walls */}
      {/* Back wall */}
      <mesh position={[0, 3, -12]} receiveShadow>
        <boxGeometry args={[24, 6, 0.2]} />
        <meshStandardMaterial color={0x3a2d28} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-12, 3, 0]} receiveShadow>
        <boxGeometry args={[0.2, 6, 24]} />
        <meshStandardMaterial color={0x3a2d28} />
      </mesh>

      {/* Right wall */}
      <mesh position={[12, 3, 0]} receiveShadow>
        <boxGeometry args={[0.2, 6, 24]} />
        <meshStandardMaterial color={0x3a2d28} />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 6, 0]}>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial color={0x2c1810} />
      </mesh>

      {/* Chandeliers */}
      <group ref={chandelier1Ref} position={[-5, 5, 0]}>
        {/* Chain */}
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
          <meshStandardMaterial color={0xffd700} metalness={0.8} />
        </mesh>
        {/* Main body */}
        <mesh castShadow>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshStandardMaterial
            color={0xffd700}
            emissive={0xffd700}
            emissiveIntensity={0.5}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
        {/* Crystals */}
        {[...Array(8)].map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * 0.6, -0.3, Math.sin(angle) * 0.6]}
              castShadow
            >
              <coneGeometry args={[0.1, 0.4, 8]} />
              <meshStandardMaterial
                color={0xffffff}
                transparent
                opacity={0.8}
                metalness={1}
                roughness={0}
              />
            </mesh>
          );
        })}
        <pointLight intensity={1} color={0xffd700} distance={10} />
      </group>

      <group ref={chandelier2Ref} position={[5, 5, 0]}>
        {/* Chain */}
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
          <meshStandardMaterial color={0xffd700} metalness={0.8} />
        </mesh>
        {/* Main body */}
        <mesh castShadow>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshStandardMaterial
            color={0xffd700}
            emissive={0xffd700}
            emissiveIntensity={0.5}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
        {/* Crystals */}
        {[...Array(8)].map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * 0.6, -0.3, Math.sin(angle) * 0.6]}
              castShadow
            >
              <coneGeometry args={[0.1, 0.4, 8]} />
              <meshStandardMaterial
                color={0xffffff}
                transparent
                opacity={0.8}
                metalness={1}
                roughness={0}
              />
            </mesh>
          );
        })}
        <pointLight intensity={1} color={0xffd700} distance={10} />
      </group>

      {/* Seating area - Circular couches */}
      {[...Array(6)].map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const radius = 6;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return (
          <group key={i} position={[x, 0, z]} rotation={[0, -angle, 0]}>
            {/* Couch base */}
            <mesh position={[0, 0.3, 0]} castShadow>
              <boxGeometry args={[2, 0.6, 1.5]} />
              <meshStandardMaterial color={0x8b4513} roughness={0.7} />
            </mesh>
            {/* Couch back */}
            <mesh position={[0, 0.8, -0.6]} castShadow>
              <boxGeometry args={[2, 0.8, 0.3]} />
              <meshStandardMaterial color={0x654321} roughness={0.7} />
            </mesh>
            {/* Cushion */}
            <mesh position={[0, 0.65, -0.1]} castShadow>
              <boxGeometry args={[1.8, 0.3, 1.2]} />
              <meshStandardMaterial color={0xa0522d} roughness={0.8} />
            </mesh>
          </group>
        );
      })}

      {/* Central coffee table */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[2, 2, 0.1, 32]} />
        <meshStandardMaterial
          color={0x8b4513}
          metalness={0.3}
          roughness={0.6}
        />
      </mesh>

      {/* Glass top */}
      <mesh position={[0, 0.41, 0]} castShadow>
        <cylinderGeometry args={[1.9, 1.9, 0.05, 32]} />
        <meshStandardMaterial
          color={0xffffff}
          transparent
          opacity={0.3}
          metalness={1}
          roughness={0}
        />
      </mesh>

      {/* Decorative objects on table */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial
          color={0x667eea}
          emissive={0x667eea}
          emissiveIntensity={0.3}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Art on walls */}
      {[-10, 0, 10].map((x, i) => (
        <mesh key={i} position={[x, 3, -11.9]} castShadow>
          <boxGeometry args={[3, 2, 0.1]} />
          <meshStandardMaterial
            color={i === 1 ? 0x667eea : 0xf093fb}
            emissive={i === 1 ? 0x667eea : 0xf093fb}
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}

      {/* Decorative pillars */}
      {[
        [-8, 0, -8],
        [8, 0, -8],
        [-8, 0, 8],
        [8, 0, 8],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, 3, z]} castShadow>
          <cylinderGeometry args={[0.4, 0.5, 6, 16]} />
          <meshStandardMaterial
            color={0x8b4513}
            metalness={0.5}
            roughness={0.5}
          />
        </mesh>
      ))}

      {/* Pillar tops */}
      {[
        [-8, 6, -8],
        [8, 6, -8],
        [-8, 6, 8],
        [8, 6, 8],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <cylinderGeometry args={[0.6, 0.4, 0.5, 16]} />
          <meshStandardMaterial
            color={0xffd700}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      ))}

      {/* Ambient particles */}
      {[...Array(50)].map((_, i) => {
        const x = (Math.random() - 0.5) * 20;
        const y = Math.random() * 5 + 1;
        const z = (Math.random() - 0.5) * 20;

        return (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial
              color={0xffd700}
              emissive={0xffd700}
              emissiveIntensity={Math.random() * 0.5 + 0.5}
            />
          </mesh>
        );
      })}

      {/* Subtle fog */}
      <fog attach="fog" args={[0x1a1a1a, 15, 30]} />
    </>
  );
};
