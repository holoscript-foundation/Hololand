import React, { useRef, useState } from 'react';
import { Mesh, Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';

/**
 * ZONE 3: Hololand Casino
 * 
 * Features from design doc:
 * - Arcade-style mini-games (cosmic slots, tower climb, crypto poker, trivia)
 * - VIP lounge with light-sequence entry puzzle
 * - Tournament brackets display
 * - Social gambling (cosmetic chips only in Phase 0)
 * - Prize redemption kiosk
 * - Neon Vegas aesthetic with theme integration
 */

export const HololandCasino: React.FC = () => {
  const slotMachine1 = useRef<Group>(null);
  const slotMachine2 = useRef<Group>(null);
  const slotMachine3 = useRef<Group>(null);
  const neonSignRef = useRef<Group>(null);
  const vipDoorRef = useRef<Mesh>(null);
  
  const [spinning] = useState([false, false, false]);

  // Animate neon sign pulsing
  useFrame((state) => {
    if (neonSignRef.current) {
      const pulse = 0.8 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
      neonSignRef.current.scale.setScalar(pulse);
    }

    // Animate slot machines when spinning
    if (slotMachine1.current && spinning[0]) {
      slotMachine1.current.rotation.y += 0.1;
    }
    if (slotMachine2.current && spinning[1]) {
      slotMachine2.current.rotation.y += 0.1;
    }
    if (slotMachine3.current && spinning[2]) {
      slotMachine3.current.rotation.y += 0.1;
    }

    // VIP door light sequence
    if (vipDoorRef.current) {
      const glow = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.5;
      (vipDoorRef.current.material as any).emissiveIntensity = glow;
    }
  });

  return (
    <>
      {/* Lighting - Neon Vegas aesthetic */}
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 8, 0]} intensity={1.2} color={0xff00ff} distance={20} />
      <pointLight position={[-8, 4, -8]} intensity={0.8} color={0x00ffff} distance={15} />
      <pointLight position={[8, 4, -8]} intensity={0.8} color={0xff0080} distance={15} />
      <spotLight 
        position={[0, 10, 5]} 
        angle={0.6} 
        penumbra={0.5} 
        intensity={1.5} 
        color={0xffd700}
        castShadow
      />

      {/* Floor - Dark carpet with pattern */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color={0x1a0033} roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Walls - Deep purple with gold trim */}
      {/* Back wall */}
      <mesh position={[0, 4, -15]} castShadow receiveShadow>
        <boxGeometry args={[30, 8, 0.5]} />
        <meshStandardMaterial color={0x2d1b4e} metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-15, 4, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 8, 30]} />
        <meshStandardMaterial color={0x2d1b4e} metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Right wall */}
      <mesh position={[15, 4, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 8, 30]} />
        <meshStandardMaterial color={0x2d1b4e} metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Neon Sign - "HOLOLAND CASINO" */}
      <group ref={neonSignRef} position={[0, 6, -14.5]}>
        <Text
          fontSize={1.5}
          color={0xff00ff}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.1}
          outlineColor={0xffffff}
        >
          HOLOLAND CASINO
        </Text>
        <pointLight position={[0, 0, 1]} intensity={2} color={0xff00ff} distance={8} />
      </group>

      {/* === SLOT MACHINES (Cosmic Slots) === */}
      {/* Slot Machine 1 */}
      <group position={[-8, 0, -8]}>
        <group ref={slotMachine1}>
          {/* Machine body */}
          <mesh position={[0, 1.5, 0]} castShadow>
            <boxGeometry args={[2, 3, 1.5]} />
            <meshStandardMaterial color={0x8b0000} metalness={0.7} roughness={0.3} />
          </mesh>
          
          {/* Screen */}
          <mesh position={[0, 2, 0.76]}>
            <planeGeometry args={[1.5, 1.5]} />
            <meshStandardMaterial 
              color={0x00ff00} 
              emissive={0x00ff00} 
              emissiveIntensity={0.5} 
            />
          </mesh>
          
          {/* Lever */}
          <mesh position={[1.2, 1, 0]} rotation={[0, 0, Math.PI / 4]}>
            <cylinderGeometry args={[0.1, 0.1, 1]} />
            <meshStandardMaterial color={0xffd700} metalness={0.9} roughness={0.1} />
          </mesh>
        </group>
        
        {/* Label */}
        <Text
          position={[0, 0.2, 1]}
          fontSize={0.2}
          color={0xffd700}
          anchorX="center"
        >
          COSMIC SLOTS
        </Text>
      </group>

      {/* Slot Machine 2 */}
      <group position={[0, 0, -8]}>
        <group ref={slotMachine2}>
          <mesh position={[0, 1.5, 0]} castShadow>
            <boxGeometry args={[2, 3, 1.5]} />
            <meshStandardMaterial color={0x00008b} metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 2, 0.76]}>
            <planeGeometry args={[1.5, 1.5]} />
            <meshStandardMaterial 
              color={0xff00ff} 
              emissive={0xff00ff} 
              emissiveIntensity={0.5} 
            />
          </mesh>
          <mesh position={[1.2, 1, 0]} rotation={[0, 0, Math.PI / 4]}>
            <cylinderGeometry args={[0.1, 0.1, 1]} />
            <meshStandardMaterial color={0xffd700} metalness={0.9} roughness={0.1} />
          </mesh>
        </group>
        <Text
          position={[0, 0.2, 1]}
          fontSize={0.2}
          color={0xffd700}
          anchorX="center"
        >
          TOWER CLIMB
        </Text>
      </group>

      {/* Slot Machine 3 */}
      <group position={[8, 0, -8]}>
        <group ref={slotMachine3}>
          <mesh position={[0, 1.5, 0]} castShadow>
            <boxGeometry args={[2, 3, 1.5]} />
            <meshStandardMaterial color={0x4b0082} metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 2, 0.76]}>
            <planeGeometry args={[1.5, 1.5]} />
            <meshStandardMaterial 
              color={0x00ffff} 
              emissive={0x00ffff} 
              emissiveIntensity={0.5} 
            />
          </mesh>
          <mesh position={[1.2, 1, 0]} rotation={[0, 0, Math.PI / 4]}>
            <cylinderGeometry args={[0.1, 0.1, 1]} />
            <meshStandardMaterial color={0xffd700} metalness={0.9} roughness={0.1} />
          </mesh>
        </group>
        <Text
          position={[0, 0.2, 1]}
          fontSize={0.2}
          color={0xffd700}
          anchorX="center"
        >
          CRYPTO POKER
        </Text>
      </group>

      {/* === POKER TABLE === */}
      <group position={[0, 0, 0]}>
        {/* Table surface - oval */}
        <mesh position={[0, 1, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[3, 3, 0.2, 32]} />
          <meshStandardMaterial color={0x006400} roughness={0.8} />
        </mesh>
        
        {/* Table edge - gold trim */}
        <mesh position={[0, 1.1, 0]} rotation={[0, 0, 0]}>
          <torusGeometry args={[3, 0.15, 16, 32]} />
          <meshStandardMaterial color={0xffd700} metalness={0.9} roughness={0.1} />
        </mesh>
        
        {/* Player positions (8 seats) */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const x = Math.cos(angle) * 3.5;
          const z = Math.sin(angle) * 3.5;
          return (
            <mesh key={i} position={[x, 0.5, z]} castShadow>
              <cylinderGeometry args={[0.4, 0.5, 1]} />
              <meshStandardMaterial color={0x8b0000} />
            </mesh>
          );
        })}
      </group>

      {/* === VIP LOUNGE ENTRANCE === */}
      <group position={[12, 0, -12]}>
        {/* VIP Door frame */}
        <mesh position={[0, 2.5, 0]} castShadow>
          <boxGeometry args={[0.3, 5, 3]} />
          <meshStandardMaterial color={0xffd700} metalness={0.9} roughness={0.1} />
        </mesh>
        
        {/* VIP Door */}
        <mesh ref={vipDoorRef} position={[0, 2.5, 0]}>
          <boxGeometry args={[0.2, 4.5, 2.5]} />
          <meshStandardMaterial 
            color={0x1a0033} 
            emissive={0xff00ff}
            emissiveIntensity={0.5}
            metalness={0.5}
            roughness={0.5}
          />
        </mesh>
        
        {/* VIP Sign */}
        <Text
          position={[0, 5.5, 0]}
          fontSize={0.5}
          color={0xffd700}
          anchorX="center"
          outlineWidth={0.05}
          outlineColor={0xff00ff}
        >
          VIP LOUNGE
        </Text>
        
        {/* Light sequence puzzle - 4 colored buttons */}
        <group position={[0.5, 2.5, 1.3]}>
          <mesh position={[0, 0.5, 0]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color={0xff0000} emissive={0xff0000} emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[0, -0.5, 0]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color={0x00ff00} emissive={0x00ff00} emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[0.5, 0, 0]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color={0x0000ff} emissive={0x0000ff} emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[-0.5, 0, 0]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color={0xffff00} emissive={0xffff00} emissiveIntensity={0.3} />
          </mesh>
        </group>
      </group>

      {/* === LEADERBOARD DISPLAY === */}
      <group position={[-12, 3, -12]}>
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[4, 6]} />
          <meshStandardMaterial 
            color={0x000033} 
            emissive={0x0000ff}
            emissiveIntensity={0.3}
          />
        </mesh>
        
        <Text
          position={[0, 2.5, 0.1]}
          fontSize={0.4}
          color={0xffd700}
          anchorX="center"
        >
          TOURNAMENT LEADERS
        </Text>
        
        {/* Sample leaderboard entries */}
        {['1. CosmicWhale - 15,420', '2. LuckyStar - 12,890', '3. VegasVibes - 11,200'].map((entry, i) => (
          <Text
            key={i}
            position={[0, 1.5 - i * 0.6, 0.1]}
            fontSize={0.25}
            color={0x00ffff}
            anchorX="center"
          >
            {entry}
          </Text>
        ))}
      </group>

      {/* === PRIZE REDEMPTION KIOSK === */}
      <group position={[-8, 0, 8]}>
        {/* Kiosk body */}
        <mesh position={[0, 2, 0]} castShadow>
          <boxGeometry args={[2, 4, 1]} />
          <meshStandardMaterial color={0x2d1b4e} metalness={0.5} roughness={0.5} />
        </mesh>
        
        {/* Screen */}
        <mesh position={[0, 2.5, 0.51]}>
          <planeGeometry args={[1.6, 2]} />
          <meshStandardMaterial 
            color={0x00ff00}
            emissive={0x00ff00}
            emissiveIntensity={0.4}
          />
        </mesh>
        
        {/* Prize dispenser slot */}
        <mesh position={[0, 0.8, 0.51]}>
          <boxGeometry args={[1.2, 0.3, 0.1]} />
          <meshStandardMaterial color={0x000000} />
        </mesh>
        
        <Text
          position={[0, 4.5, 0]}
          fontSize={0.3}
          color={0xffd700}
          anchorX="center"
        >
          PRIZE REDEMPTION
        </Text>
      </group>

      {/* === TRIVIA STATION === */}
      <group position={[8, 0, 8]}>
        {/* Trivia podium */}
        <mesh position={[0, 1, 0]} castShadow>
          <boxGeometry args={[2, 2, 1.5]} />
          <meshStandardMaterial color={0x4b0082} metalness={0.6} roughness={0.4} />
        </mesh>
        
        {/* Screen */}
        <mesh position={[0, 2.5, 0.76]}>
          <planeGeometry args={[1.8, 1.5]} />
          <meshStandardMaterial 
            color={0xff00ff}
            emissive={0xff00ff}
            emissiveIntensity={0.4}
          />
        </mesh>
        
        <Text
          position={[0, 0.2, 1]}
          fontSize={0.25}
          color={0xffd700}
          anchorX="center"
        >
          HOLO TRIVIA
        </Text>
      </group>

      {/* === COSMETIC CHIPS DISPLAY === */}
      <group position={[0, 0, 8]}>
        {/* Chip display case */}
        <mesh position={[0, 1.5, 0]} castShadow>
          <boxGeometry args={[3, 1, 1]} />
          <meshStandardMaterial 
            color={0x000033}
            transparent
            opacity={0.3}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
        
        {/* Sample chips */}
        {[-1, 0, 1].map((offset, i) => (
          <mesh key={i} position={[offset, 1.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.1, 32]} />
            <meshStandardMaterial 
              color={i === 0 ? 0xffd700 : i === 1 ? 0xff0000 : 0x0000ff}
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
        ))}
        
        <Text
          position={[0, 0.5, 0]}
          fontSize={0.2}
          color={0xffd700}
          anchorX="center"
        >
          COSMETIC CHIPS
        </Text>
      </group>

      {/* === AMBIENT DECORATIONS === */}
      {/* Neon underglow around room */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const x = Math.cos(angle) * 14;
        const z = Math.sin(angle) * 14;
        const color = i % 3 === 0 ? 0xff00ff : i % 3 === 1 ? 0x00ffff : 0xffd700;
        return (
          <pointLight 
            key={i}
            position={[x, 0.2, z]} 
            intensity={0.5} 
            color={color}
            distance={3}
          />
        );
      })}

      {/* Floating lucky symbols */}
      {[
        { pos: [-4, 5, -4], color: 0xffd700 },
        { pos: [4, 5, -4], color: 0xff00ff },
        { pos: [0, 6, 4], color: 0x00ffff },
      ].map((symbol, i) => (
        <mesh key={i} position={symbol.pos as [number, number, number]}>
          <torusGeometry args={[0.5, 0.1, 16, 32]} />
          <meshStandardMaterial 
            color={symbol.color}
            emissive={symbol.color}
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
    </>
  );
};
