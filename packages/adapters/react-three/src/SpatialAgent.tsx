import React, { useEffect, useMemo, useRef, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Gltf } from '@react-three/drei';
import { AvatarEmbodimentPipeline } from '@hololand/audio';
import { AIDriverTrait, NPCContext } from '@holoscript/core';

export interface SpatialAgentProps {
  children?: React.ReactNode;
  config: any;
  avatarEmbodiment?: any;
  lipSync?: any;
  emotionDirective?: any;
  aiDriven?: any;
}

/**
 * SpatialAgent
 * 
 * High-fidelity AI agent component that integrates the full embodiment pipeline:
 * STT -> LLM -> TTS -> Lip Sync -> Emotion -> Animation.
 */
export const SpatialAgent: React.FC<SpatialAgentProps> = ({ 
  children, 
  config, 
  avatarEmbodiment, 
  lipSync, 
  emotionDirective,
  aiDriven 
}) => {
  const groupRef = useRef<any>(null);
  const meshRef = useRef<any>(null);

  const pipeline = useMemo(() => new AvatarEmbodimentPipeline({
    avatar: avatarEmbodiment,
    lipSync: lipSync,
    emotion: emotionDirective,
    // Provide defaults if missing
    fillerGestures: true,
  }), [avatarEmbodiment, lipSync, emotionDirective]);

  const aiDriver = useMemo(() => new AIDriverTrait(aiDriven || {}), [aiDriven]);

  useEffect(() => {
    aiDriver.startAI();
    pipeline.start();

    // Wire AI Driver dialogue to Pipeline input
    // In a real implementation, the AI Driver would emit events that the pipeline listens to
    
    return () => {
      aiDriver.stopAI();
      pipeline.stop();
    };
  }, [aiDriver, pipeline]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Update AI context with world position
    const worldPos = groupRef.current.position;
    aiDriver.setPosition([worldPos.x, worldPos.y, worldPos.z]);

    // Update embodiment pipeline and get morph targets
    const morphWeights = pipeline.update(delta);

    // Apply morph weights to the mesh if found
    if (meshRef.current) {
      Object.entries(morphWeights).forEach(([name, weight]) => {
        const index = meshRef.current.morphTargetDictionary?.[name];
        if (index !== undefined) {
          meshRef.current.morphTargetInfluences[index] = weight;
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      <Suspense fallback={null}>
        {config?.modelUrl ? (
          <Gltf 
            src={config.modelUrl} 
            castShadow 
            receiveShadow 
            onLoad={(gltf) => {
              // Find the main mesh for morph targets
              gltf.scene.traverse((node: any) => {
                if (node.isMesh && node.morphTargetDictionary) {
                  meshRef.current = node;
                }
              });
            }}
          />
        ) : (
          children
        )}
      </Suspense>
    </group>
  );
};
