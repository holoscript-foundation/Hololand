import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Gltf } from '@react-three/drei';
import { AIDriverTrait, AIDriverConfig, NPCContext } from '@holoscript/core';

export interface IntelligenceEntityProps {
  children: React.ReactNode;
  config: AIDriverConfig;
}

/**
 * IntelligenceEntity
 * 
 * Manages the AI behavior and dialogue lifecycle for a HoloScript object.
 * Integrates the AIDriverTrait into the R3F frame loop.
 * Now includes speech bubble rendering.
 */
export const IntelligenceEntity: React.FC<IntelligenceEntityProps> = ({ children, config }) => {
  const driver = useMemo(() => new AIDriverTrait(config), [config]);
  const groupRef = useRef<any>(null);
  const [context, setContext] = useState<NPCContext | null>(null);

  useEffect(() => {
    driver.startAI();
    return () => driver.stopAI();
  }, [driver]);

  useFrame(() => {
    if (!groupRef.current) return;
    
    const ctx = driver.getContext();
    setContext(ctx);
    
    // sync NPC position back to AI context if it moved in R3F
    const pos = groupRef.current.position;
    driver.setPosition([pos.x, pos.y, pos.z]);
  });

  return (
    <group ref={groupRef}>
      <Suspense fallback={null}>
        {(config as any).modelUrl ? (
          <Gltf src={(config as any).modelUrl} castShadow receiveShadow />
        ) : (
          children
        )}
      </Suspense>
      
      {/* Speech Bubble */}
      {context?.dialogue?.lastSaid && (
        <group position={[0, (config as any).height || 2.2, 0]}>
          <Text
            fontSize={0.2}
            color="white"
            anchorX="center"
            anchorY="middle"
            maxWidth={2}
          >
            {context.dialogue.lastSaid}
          </Text>
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[2.2, 0.4]} />
            <meshStandardMaterial color="black" transparent opacity={0.6} />
          </mesh>
        </group>
      )}
    </group>
  );
};
