/**
 * Forest Portal Component
 * 
 * React Three Fiber component for the Legends portal in Hololand Oasis
 */

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, useGLTF, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

interface ForestPortalProps {
  position?: [number, number, number];
  onEnter?: () => void;
}

export function ForestPortal({ 
  position = [45, 0, -30], 
  onEnter 
}: ForestPortalProps) {
  const portalRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [pulsePhase, setPulsePhase] = useState(0);

  // Animate portal glow
  useFrame((_, delta) => {
    setPulsePhase((prev) => (prev + delta * 2) % (Math.PI * 2));
    
    if (glowRef.current) {
      const intensity = 0.5 + Math.sin(pulsePhase) * 0.3;
      (glowRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 
        hovered ? intensity + 0.3 : intensity;
    }
  });

  const handleClick = () => {
    // Play portal sound
    const audio = new Audio('/assets/audio/portal_whoosh.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
    
    // Trigger enter callback
    onEnter?.();
  };

  return (
    <group ref={portalRef} position={position}>
      {/* Portal Arch */}
      <mesh
        ref={glowRef}
        onClick={handleClick}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <torusGeometry args={[1.5, 0.2, 16, 32]} />
        <meshStandardMaterial
          color="#22c55e"
          emissive="#4ade80"
          emissiveIntensity={0.5}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Portal Center (swirling effect) */}
      <mesh position={[0, 0, 0.1]}>
        <circleGeometry args={[1.3, 32]} />
        <meshBasicMaterial
          color="#1a4d2e"
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Sparkles around portal */}
      <Sparkles
        count={50}
        scale={4}
        size={3}
        speed={0.5}
        color="#fef08a"
      />

      {/* Portal Sign */}
      <group position={[-3, 0, 2]} rotation={[0, 0.3, 0]}>
        {/* Sign post */}
        <mesh position={[0, 0.75, 0]}>
          <boxGeometry args={[0.1, 1.5, 0.1]} />
          <meshStandardMaterial color="#8b5a2b" />
        </mesh>
        
        {/* Sign board */}
        <mesh position={[0, 1.5, 0]}>
          <boxGeometry args={[1.5, 0.6, 0.1]} />
          <meshStandardMaterial color="#a0522d" />
        </mesh>
        
        {/* Sign text */}
        <Text
          position={[0, 1.6, 0.06]}
          fontSize={0.12}
          color="#f5f5dc"
          font="/fonts/medieval.woff"
          anchorX="center"
          anchorY="middle"
        >
          HOLOLAND LEGENDS
        </Text>
        <Text
          position={[0, 1.4, 0.06]}
          fontSize={0.06}
          color="#d4d4d4"
          anchorX="center"
          anchorY="middle"
        >
          A 2D Adventure
        </Text>
      </group>

      {/* Ground decoration - moss/grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[3, 32]} />
        <meshStandardMaterial color="#166534" />
      </mesh>

      {/* Firefly particles */}
      <Sparkles
        count={30}
        scale={6}
        size={2}
        speed={0.2}
        color="#fbbf24"
        opacity={0.8}
      />
    </group>
  );
}

/**
 * Navigation handler for portal transitions
 */
export function usePortalNavigation() {
  const navigateToLegends = () => {
    // Save current position for return
    sessionStorage.setItem('returnPoint', 'forest_portal');
    sessionStorage.setItem('returnPosition', JSON.stringify([45, 0, -30]));
    
    // Fade transition
    document.body.style.transition = 'opacity 0.5s';
    document.body.style.opacity = '0';
    
    setTimeout(() => {
      // Navigate to Legends
      window.location.href = '/legends';
    }, 500);
  };

  const returnFromLegends = () => {
    const returnPoint = sessionStorage.getItem('returnPoint');
    
    if (returnPoint === 'forest_portal') {
      window.location.href = '/oasis#forest_portal';
    } else {
      window.location.href = '/oasis';
    }
  };

  return { navigateToLegends, returnFromLegends };
}
