import React, { useRef } from 'react';
import { Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';

export const InfinityShop: React.FC = () => {
  const shopRef = useRef<Mesh>(null);
  const signRef = useRef<Mesh>(null);

  // Gentle floating animation
  useFrame((state) => {
    if (shopRef.current) {
      shopRef.current.position.y = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
    if (signRef.current) {
      signRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.1;
    }
  });

  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.4} />

      {/* Main lights */}
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <pointLight position={[0, 8, 0]} intensity={0.8} color={0x667eea} distance={20} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial
          color={0x1a1a2e}
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>

      {/* Shop Building */}
      <group ref={shopRef}>
        {/* Main structure */}
        <RoundedBox args={[12, 6, 10]} radius={0.3} position={[0, 3, -5]} castShadow>
          <meshStandardMaterial
            color={0x16213e}
            metalness={0.7}
            roughness={0.3}
            emissive={0x667eea}
            emissiveIntensity={0.1}
          />
        </RoundedBox>

        {/* Roof accent */}
        <mesh position={[0, 6.5, -5]} castShadow>
          <boxGeometry args={[13, 0.5, 11]} />
          <meshStandardMaterial
            color={0x667eea}
            emissive={0x667eea}
            emissiveIntensity={0.3}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>

        {/* Door frame (closed) */}
        <RoundedBox args={[3, 4, 0.3]} radius={0.1} position={[0, 2, 0.2]}>
          <meshStandardMaterial
            color={0x0f3460}
            metalness={0.6}
            roughness={0.4}
          />
        </RoundedBox>

        {/* Door (locked) */}
        <RoundedBox args={[2.8, 3.8, 0.2]} radius={0.1} position={[0, 2, 0.35]}>
          <meshStandardMaterial
            color={0x1a1a2e}
            metalness={0.5}
            roughness={0.5}
          />
        </RoundedBox>

        {/* Door lock icon */}
        <mesh position={[0, 2, 0.5]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial
            color={0xffd700}
            emissive={0xffd700}
            emissiveIntensity={0.5}
            metalness={1}
            roughness={0}
          />
        </mesh>

        {/* Windows (dark/off) */}
        <RoundedBox args={[2, 2, 0.1]} radius={0.1} position={[-4, 4, 0.2]}>
          <meshStandardMaterial
            color={0x0a0a0a}
            metalness={0.9}
            roughness={0.1}
            transparent
            opacity={0.3}
          />
        </RoundedBox>
        <RoundedBox args={[2, 2, 0.1]} radius={0.1} position={[4, 4, 0.2]}>
          <meshStandardMaterial
            color={0x0a0a0a}
            metalness={0.9}
            roughness={0.1}
            transparent
            opacity={0.3}
          />
        </RoundedBox>
      </group>

      {/* "COMING SOON" Sign */}
      <group ref={signRef} position={[0, 7, 0]}>
        <RoundedBox args={[10, 2, 0.5]} radius={0.1} castShadow>
          <meshStandardMaterial
            color={0x667eea}
            emissive={0x667eea}
            emissiveIntensity={0.4}
            metalness={0.8}
            roughness={0.2}
          />
        </RoundedBox>
        <Text
          position={[0, 0.5, 0.3]}
          fontSize={0.8}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          font="/fonts/bold.woff"
        >
          INFINITY SHOP
        </Text>
        <Text
          position={[0, -0.5, 0.3]}
          fontSize={0.4}
          color="#ffd700"
          anchorX="center"
          anchorY="middle"
        >
          COMING SOON
        </Text>
      </group>

      {/* Brittney Avatar Hologram Placeholder */}
      <group position={[0, 3, 5]}>
        {/* Hologram platform */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[2, 2, 0.3, 32]} />
          <meshStandardMaterial
            color={0x667eea}
            emissive={0x667eea}
            emissiveIntensity={0.3}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>

        {/* Hologram effect (will be Brittney avatar) */}
        <mesh position={[0, 2, 0]}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial
            color={0x667eea}
            emissive={0x667eea}
            emissiveIntensity={0.5}
            transparent
            opacity={0.3}
            wireframe
          />
        </mesh>

        <Text
          position={[0, 4, 0]}
          fontSize={0.4}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          Meet Brittney
        </Text>
        <Text
          position={[0, 3.4, 0]}
          fontSize={0.25}
          color="#aaaaaa"
          anchorX="center"
          anchorY="middle"
        >
          Your Infinity Assistant
        </Text>
      </group>

      {/* Info Boards Around Shop */}
      <group position={[-8, 2, 0]}>
        <RoundedBox args={[4, 3, 0.2]} radius={0.1} castShadow>
          <meshStandardMaterial color={0x16213e} metalness={0.6} roughness={0.4} />
        </RoundedBox>
        <Text
          position={[0, 0.8, 0.15]}
          fontSize={0.3}
          color="#667eea"
          anchorX="center"
          maxWidth={3.5}
        >
          Build Without Code
        </Text>
        <Text
          position={[0, 0.2, 0.15]}
          fontSize={0.18}
          color="#aaaaaa"
          anchorX="center"
          maxWidth={3.5}
          lineHeight={1.2}
        >
          Create VR worlds with{'\n'}AI assistance
        </Text>
      </group>

      <group position={[8, 2, 0]} rotation={[0, Math.PI, 0]}>
        <RoundedBox args={[4, 3, 0.2]} radius={0.1} castShadow>
          <meshStandardMaterial color={0x16213e} metalness={0.6} roughness={0.4} />
        </RoundedBox>
        <Text
          position={[0, 0.8, 0.15]}
          fontSize={0.3}
          color="#667eea"
          anchorX="center"
          maxWidth={3.5}
        >
          Voice & Visual Tools
        </Text>
        <Text
          position={[0, 0.2, 0.15]}
          fontSize={0.18}
          color="#aaaaaa"
          anchorX="center"
          maxWidth={3.5}
          lineHeight={1.2}
        >
          Natural language{'\n'}world building
        </Text>
      </group>

      {/* Construction barriers */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 8;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return (
          <group key={i} position={[x, 0.5, z]} rotation={[0, -angle, 0]}>
            <mesh>
              <boxGeometry args={[1, 1, 0.1]} />
              <meshStandardMaterial
                color={0xffd700}
                emissive={0xffd700}
                emissiveIntensity={0.2}
              />
            </mesh>
            <Text
              position={[0, 0, 0.06]}
              fontSize={0.3}
              color="#000000"
              anchorX="center"
              anchorY="middle"
            >
              ⚠️
            </Text>
          </group>
        );
      })}

      {/* Ambient particles */}
      {[...Array(50)].map((_, i) => {
        const x = (Math.random() - 0.5) * 40;
        const y = Math.random() * 15 + 5;
        const z = (Math.random() - 0.5) * 40;

        return (
          <mesh key={`particle-${i}`} position={[x, y, z]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial
              color={0x667eea}
              emissive={0x667eea}
              emissiveIntensity={Math.random() * 0.8 + 0.2}
            />
          </mesh>
        );
      })}

      {/* Fog */}
      <fog attach="fog" args={[0x0a0a0a, 20, 60]} />
    </>
  );
};
