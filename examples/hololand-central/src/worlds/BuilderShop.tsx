import React, { useRef, useState } from 'react';
import { Mesh, Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';

/**
 * ZONE 2: Builder Shop
 * 
 * Features from design doc:
 * - Asset store (3D models, textures, scripts, templates)
 * - Template showcase with live previews
 * - Creator portfolio displays
 * - Leaderboard (top earners, trending assets)
 * - Workshop spaces for live demos
 * - Bright modern retail aesthetic
 * - Glass storefronts, demo stations, creator booths
 */

export const BuilderShop: React.FC = () => {
  const showcaseRotatorRef = useRef<Group>(null);
  const hologramRef1 = useRef<Mesh>(null);
  const hologramRef2 = useRef<Mesh>(null);
  const hologramRef3 = useRef<Mesh>(null);
  
  const [selectedAsset, setSelectedAsset] = useState<number>(0);

  // Animate showcase rotator and holograms
  useFrame((state) => {
    if (showcaseRotatorRef.current) {
      showcaseRotatorRef.current.rotation.y += 0.005;
    }

    // Hologram animations
    const holograms = [hologramRef1, hologramRef2, hologramRef3];
    holograms.forEach((ref, i) => {
      if (ref.current) {
        ref.current.position.y = 2 + Math.sin(state.clock.elapsedTime + i) * 0.3;
        ref.current.rotation.y += 0.01;
      }
    });
  });

  return (
    <>
      {/* Lighting - Bright modern retail */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow />
      <pointLight position={[0, 8, 0]} intensity={0.8} color={0xffffff} />
      <spotLight 
        position={[-8, 6, 0]} 
        angle={0.5} 
        penumbra={0.5} 
        intensity={1} 
        color={0x4488ff}
        castShadow
      />
      <spotLight 
        position={[8, 6, 0]} 
        angle={0.5} 
        penumbra={0.5} 
        intensity={1} 
        color={0xff8844}
        castShadow
      />

      {/* Floor - Polished white tile */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial 
          color={0xf5f5f5} 
          roughness={0.1} 
          metalness={0.3}
        />
      </mesh>

      {/* Accent floor tiles - Grid pattern */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh 
          key={`tile-${i}`}
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[-12 + i * 3, 0.01, 0]}
          receiveShadow
        >
          <planeGeometry args={[0.2, 30]} />
          <meshStandardMaterial color={0x4488ff} roughness={0.2} metalness={0.5} />
        </mesh>
      ))}

      {/* Walls - Clean white with blue accents */}
      {/* Back wall */}
      <mesh position={[0, 4, -15]} castShadow receiveShadow>
        <boxGeometry args={[30, 8, 0.5]} />
        <meshStandardMaterial color={0xffffff} roughness={0.3} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-15, 4, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 8, 30]} />
        <meshStandardMaterial color={0xffffff} roughness={0.3} />
      </mesh>

      {/* Right wall */}
      <mesh position={[15, 4, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 8, 30]} />
        <meshStandardMaterial color={0xffffff} roughness={0.3} />
      </mesh>

      {/* Blue accent trim on walls */}
      <mesh position={[0, 7.5, -15]}>
        <boxGeometry args={[30, 0.3, 0.6]} />
        <meshStandardMaterial color={0x4488ff} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* === MAIN SHOP COUNTER === */}
      <group position={[0, 0, -8]}>
        {/* Counter base */}
        <mesh position={[0, 1, 0]} castShadow>
          <boxGeometry args={[8, 2, 2]} />
          <meshStandardMaterial color={0x333333} roughness={0.4} metalness={0.6} />
        </mesh>
        
        {/* Glass counter top */}
        <mesh position={[0, 2.05, 0]} castShadow>
          <boxGeometry args={[8.2, 0.1, 2.2]} />
          <meshStandardMaterial 
            color={0x88ccff}
            transparent
            opacity={0.4}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
        
        {/* Display items on counter */}
        {[-2, 0, 2].map((offset, i) => (
          <mesh key={i} position={[offset, 2.5, 0]}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial 
              color={i === 0 ? 0xff8844 : i === 1 ? 0x4488ff : 0x88ff44}
              metalness={0.7}
              roughness={0.2}
            />
          </mesh>
        ))}
        
        <Text
          position={[0, 3, 0]}
          fontSize={0.4}
          color={0x4488ff}
          anchorX="center"
        >
          ASSET CHECKOUT
        </Text>
      </group>

      {/* === TEMPLATE SHOWCASE - Rotating Display === */}
      <group ref={showcaseRotatorRef} position={[0, 2, 0]}>
        {/* Central pedestal */}
        <mesh position={[0, -1, 0]} castShadow>
          <cylinderGeometry args={[1.5, 2, 2, 32]} />
          <meshStandardMaterial color={0x333333} metalness={0.6} roughness={0.4} />
        </mesh>
        
        {/* Showcase platforms */}
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (i / 6) * Math.PI * 2;
          const radius = 4;
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;
          
          return (
            <group key={i} position={[x, 0, z]}>
              {/* Platform */}
              <mesh position={[0, -0.5, 0]} castShadow>
                <cylinderGeometry args={[0.8, 0.8, 0.2, 32]} />
                <meshStandardMaterial color={0x4488ff} metalness={0.7} roughness={0.3} />
              </mesh>
              
              {/* Template preview box */}
              <mesh position={[0, 0.3, 0]} castShadow>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial 
                  color={0x88ccff}
                  transparent
                  opacity={0.6}
                  metalness={0.5}
                  roughness={0.3}
                />
              </mesh>
              
              {/* Hologram effect */}
              <pointLight position={[0, 1, 0]} intensity={0.5} color={0x4488ff} distance={2} />
            </group>
          );
        })}
      </group>

      {/* === ASSET VENDING MACHINES === */}
      {/* Vending Machine 1 - 3D Models */}
      <group position={[-10, 0, -10]}>
        <mesh position={[0, 2, 0]} castShadow>
          <boxGeometry args={[2.5, 4, 1.5]} />
          <meshStandardMaterial color={0x2d2d2d} roughness={0.3} metalness={0.7} />
        </mesh>
        
        {/* Screen */}
        <mesh position={[0, 2.5, 0.76]}>
          <planeGeometry args={[2, 2.5]} />
          <meshStandardMaterial 
            color={0x4488ff}
            emissive={0x4488ff}
            emissiveIntensity={0.3}
          />
        </mesh>
        
        <Text
          position={[0, 4.5, 0]}
          fontSize={0.3}
          color={0xffffff}
          anchorX="center"
        >
          3D MODELS
        </Text>
      </group>

      {/* Vending Machine 2 - Textures */}
      <group position={[-10, 0, 0]}>
        <mesh position={[0, 2, 0]} castShadow>
          <boxGeometry args={[2.5, 4, 1.5]} />
          <meshStandardMaterial color={0x2d2d2d} roughness={0.3} metalness={0.7} />
        </mesh>
        
        <mesh position={[0, 2.5, 0.76]}>
          <planeGeometry args={[2, 2.5]} />
          <meshStandardMaterial 
            color={0xff8844}
            emissive={0xff8844}
            emissiveIntensity={0.3}
          />
        </mesh>
        
        <Text
          position={[0, 4.5, 0]}
          fontSize={0.3}
          color={0xffffff}
          anchorX="center"
        >
          TEXTURES
        </Text>
      </group>

      {/* Vending Machine 3 - Scripts */}
      <group position={[-10, 0, 10]}>
        <mesh position={[0, 2, 0]} castShadow>
          <boxGeometry args={[2.5, 4, 1.5]} />
          <meshStandardMaterial color={0x2d2d2d} roughness={0.3} metalness={0.7} />
        </mesh>
        
        <mesh position={[0, 2.5, 0.76]}>
          <planeGeometry args={[2, 2.5]} />
          <meshStandardMaterial 
            color={0x88ff44}
            emissive={0x88ff44}
            emissiveIntensity={0.3}
          />
        </mesh>
        
        <Text
          position={[0, 4.5, 0]}
          fontSize={0.3}
          color={0xffffff}
          anchorX="center"
        >
          SCRIPTS
        </Text>
      </group>

      {/* === CREATOR PORTFOLIO BOOTHS === */}
      {/* Booth 1 */}
      <group position={[10, 0, -10]}>
        {/* Glass storefront */}
        <mesh position={[0, 2.5, -0.5]} castShadow>
          <boxGeometry args={[4, 5, 0.1]} />
          <meshStandardMaterial 
            color={0x88ccff}
            transparent
            opacity={0.3}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
        
        {/* Booth structure */}
        <mesh position={[0, 2.5, -1]} castShadow receiveShadow>
          <boxGeometry args={[4, 5, 2]} />
          <meshStandardMaterial color={0xf5f5f5} roughness={0.4} />
        </mesh>
        
        {/* Creator hologram */}
        <mesh ref={hologramRef1} position={[0, 2, -1]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial 
            color={0x4488ff}
            transparent
            opacity={0.6}
            emissive={0x4488ff}
            emissiveIntensity={0.5}
          />
        </mesh>
        
        <Text
          position={[0, 5.5, -0.5]}
          fontSize={0.3}
          color={0x4488ff}
          anchorX="center"
        >
          CREATOR: VoxelWizard
        </Text>
      </group>

      {/* Booth 2 */}
      <group position={[10, 0, 0]}>
        <mesh position={[0, 2.5, -0.5]} castShadow>
          <boxGeometry args={[4, 5, 0.1]} />
          <meshStandardMaterial 
            color={0xff8844}
            transparent
            opacity={0.3}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
        
        <mesh position={[0, 2.5, -1]} castShadow receiveShadow>
          <boxGeometry args={[4, 5, 2]} />
          <meshStandardMaterial color={0xf5f5f5} roughness={0.4} />
        </mesh>
        
        <mesh ref={hologramRef2} position={[0, 2, -1]}>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshStandardMaterial 
            color={0xff8844}
            transparent
            opacity={0.6}
            emissive={0xff8844}
            emissiveIntensity={0.5}
          />
        </mesh>
        
        <Text
          position={[0, 5.5, -0.5]}
          fontSize={0.3}
          color={0xff8844}
          anchorX="center"
        >
          CREATOR: PixelForge
        </Text>
      </group>

      {/* Booth 3 */}
      <group position={[10, 0, 10]}>
        <mesh position={[0, 2.5, -0.5]} castShadow>
          <boxGeometry args={[4, 5, 0.1]} />
          <meshStandardMaterial 
            color={0x88ff44}
            transparent
            opacity={0.3}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
        
        <mesh position={[0, 2.5, -1]} castShadow receiveShadow>
          <boxGeometry args={[4, 5, 2]} />
          <meshStandardMaterial color={0xf5f5f5} roughness={0.4} />
        </mesh>
        
        <mesh ref={hologramRef3} position={[0, 2, -1]}>
          <torusGeometry args={[0.5, 0.2, 16, 32]} />
          <meshStandardMaterial 
            color={0x88ff44}
            transparent
            opacity={0.6}
            emissive={0x88ff44}
            emissiveIntensity={0.5}
          />
        </mesh>
        
        <Text
          position={[0, 5.5, -0.5]}
          fontSize={0.3}
          color={0x88ff44}
          anchorX="center"
        >
          CREATOR: MeshMaster
        </Text>
      </group>

      {/* === LEADERBOARD DISPLAYS === */}
      {/* Top Earners Leaderboard */}
      <group position={[-6, 3, 12]}>
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[4, 6]} />
          <meshStandardMaterial 
            color={0x1a1a1a}
            emissive={0x4488ff}
            emissiveIntensity={0.2}
          />
        </mesh>
        
        <Text
          position={[0, 2.7, 0.1]}
          fontSize={0.4}
          color={0x4488ff}
          anchorX="center"
        >
          TOP EARNERS
        </Text>
        
        {[
          '1. VoxelWizard - $12,450',
          '2. PixelForge - $9,820',
          '3. MeshMaster - $8,330',
          '4. ScriptSage - $7,100',
          '5. TextureTitan - $6,890'
        ].map((entry, i) => (
          <Text
            key={i}
            position={[0, 1.8 - i * 0.6, 0.1]}
            fontSize={0.25}
            color={0xffffff}
            anchorX="center"
          >
            {entry}
          </Text>
        ))}
      </group>

      {/* Trending Assets Leaderboard */}
      <group position={[6, 3, 12]}>
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[4, 6]} />
          <meshStandardMaterial 
            color={0x1a1a1a}
            emissive={0xff8844}
            emissiveIntensity={0.2}
          />
        </mesh>
        
        <Text
          position={[0, 2.7, 0.1]}
          fontSize={0.4}
          color={0xff8844}
          anchorX="center"
        >
          TRENDING ASSETS
        </Text>
        
        {[
          '🔥 Cyber City Pack',
          '⚡ Neon Skybox Set',
          '🌟 Low-Poly Trees',
          '💎 Crystal Shaders',
          '🎨 Retro Texture Kit'
        ].map((entry, i) => (
          <Text
            key={i}
            position={[0, 1.8 - i * 0.6, 0.1]}
            fontSize={0.25}
            color={0xffffff}
            anchorX="center"
          >
            {entry}
          </Text>
        ))}
      </group>

      {/* === WORKSHOP DEMO STATION === */}
      <group position={[0, 0, 10]}>
        {/* Demo table */}
        <mesh position={[0, 1, 0]} castShadow>
          <boxGeometry args={[6, 2, 3]} />
          <meshStandardMaterial color={0x333333} roughness={0.4} metalness={0.6} />
        </mesh>
        
        {/* Interactive screens */}
        {[-2, 0, 2].map((offset, i) => (
          <mesh key={i} position={[offset, 2.5, 0]}>
            <planeGeometry args={[1.5, 1]} />
            <meshStandardMaterial 
              color={i === 0 ? 0x4488ff : i === 1 ? 0xff8844 : 0x88ff44}
              emissive={i === 0 ? 0x4488ff : i === 1 ? 0xff8844 : 0x88ff44}
              emissiveIntensity={0.3}
            />
          </mesh>
        ))}
        
        <Text
          position={[0, 3.5, 0]}
          fontSize={0.35}
          color={0xffffff}
          anchorX="center"
        >
          LIVE WORKSHOP
        </Text>
      </group>

      {/* === HANGING SIGNS === */}
      {[
        { pos: [-8, 6, -5], text: 'MODELS', color: 0x4488ff },
        { pos: [0, 6, -5], text: 'TEMPLATES', color: 0xff8844 },
        { pos: [8, 6, -5], text: 'PORTFOLIOS', color: 0x88ff44 },
      ].map((sign, i) => (
        <group key={i} position={sign.pos as [number, number, number]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[2.5, 0.5, 0.1]} />
            <meshStandardMaterial color={0x1a1a1a} />
          </mesh>
          
          <Text
            position={[0, 0, 0.06]}
            fontSize={0.25}
            color={sign.color}
            anchorX="center"
            anchorY="middle"
          >
            {sign.text}
          </Text>
          
          {/* Hanging chain */}
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.5]} />
            <meshStandardMaterial color={0x888888} metalness={0.9} roughness={0.1} />
          </mesh>
        </group>
      ))}

      {/* === DECORATIVE ELEMENTS === */}
      {/* Floating asset icons */}
      {[
        { pos: [-12, 5, -8], color: 0x4488ff },
        { pos: [12, 5, -8], color: 0xff8844 },
        { pos: [0, 7, 0], color: 0x88ff44 },
      ].map((icon, i) => (
        <mesh key={i} position={icon.pos as [number, number, number]}>
          <octahedronGeometry args={[0.4]} />
          <meshStandardMaterial 
            color={icon.color}
            emissive={icon.color}
            emissiveIntensity={0.4}
            wireframe
          />
        </mesh>
      ))}

      {/* Spotlight pools on floor */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const x = Math.cos(angle) * 8;
        const z = Math.sin(angle) * 8;
        return (
          <spotLight
            key={i}
            position={[x, 6, z]}
            angle={0.3}
            penumbra={0.5}
            intensity={0.6}
            color={0xffffff}
            target-position={[x, 0, z]}
          />
        );
      })}
    </>
  );
};
