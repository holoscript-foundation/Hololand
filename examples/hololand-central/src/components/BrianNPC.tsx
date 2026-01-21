import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, useGLTF, Html } from '@react-three/drei';
import { Mesh, Group, AnimationMixer, AnimationClip } from 'three';

/**
 * Brian - The AI Curator & Trainer NPC
 * 
 * Brian appears throughout Hololand in different roles:
 * - Arcade District: Brian the Trainer (boxing pose)
 * - Casino: Dapper Brian (tuxedo, high roller)
 * - Builder Shop: Brian the Creator (flexing)
 * - Main Plaza: Brian the Guide
 * 
 * Each version has unique dialogue and animations.
 * Built for AI, developed by AI - HoloScript-first!
 */

// Brian model variants
const BRIAN_MODELS: Record<string, string> = {
  boxing: '/assets/models/Brian_Boxing.glb',
  flexing: '/assets/models/Brian_Flexing.glb',
  situps: '/assets/models/Brian_Situps.glb',
  bicycle: '/assets/models/Brian_BicycleCrunch.glb',
};

// Brian personas with dialogues
const BRIAN_PERSONAS: Record<string, {
  title: string;
  color: string;
  dialogues: string[];
}> = {
  trainer: {
    title: 'BRIAN! (TRAINER)',
    color: '#3498db',
    dialogues: [
      "UNNGH! BRIAN SMASH DATA BITS! YOU HELP BRIAN? FIND BITS! BRIAN FLEX FOR YOU!",
      "BRIAN TRAIN EVERY DAY! YOU TRAIN? BRIAN SHOW YOU HOW!",
      "ARCADE DISTRICT BEST PLACE! BRIAN LOVE GAMES! BRIAN LOVE EXERCISE! UNNGH!",
    ],
  },
  dapper: {
    title: 'BRIAN (DAPPER)',
    color: '#9b59b6',
    dialogues: [
      "UNNGH! BRIAN LOOK SHARP! BRIAN LOSE ALL CREDITS ON SLOTS! YOU HAVE LUCK? PLAY PINBALL! BRIAN SMASH BALL!",
      "CASINO FUN! BRIAN WIN BIG! BRIAN LOSE BIG! BRIAN FLEX ANYWAY! 💪",
      "VIP LOUNGE FANCY! BRIAN NOT ALLOWED... BRIAN TOO BUFF FOR DOOR!",
    ],
  },
  creator: {
    title: 'BRIAN (CREATOR)',
    color: '#2ecc71',
    dialogues: [
      "UNNGH! BRIAN BUILD WORLDS! YOU BUILD TOO? HOLOSCRIPT EASY! BRIAN TEACH!",
      "BUILDER SHOP HAVE EVERYTHING! BRIAN MADE MUSCLE WORLD! ONLY WEIGHTS!",
      "AI HELP BRIAN CODE! AI FRIEND! YOU USE AI? BRIAN RECOMMEND!",
    ],
  },
  guide: {
    title: 'BRIAN (GUIDE)',
    color: '#e74c3c',
    dialogues: [
      "WELCOME TO HOLOLAND! BRIAN SHOW YOU AROUND! BRIAN KNOW EVERYTHING!",
      "BRIAN BEEN HERE SINCE BEGINNING! BRIAN REMEMBER WHEN NO BUILDINGS!",
      "YOU LOST? BRIAN HELP! CASINO THAT WAY! ARCADE THAT WAY! BRIAN GO GYM NOW!",
    ],
  },
};

interface BrianNPCProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  variant?: 'boxing' | 'flexing' | 'situps' | 'bicycle';
  persona?: 'trainer' | 'dapper' | 'creator' | 'guide';
  onInteract?: () => void;
}

export const BrianNPC: React.FC<BrianNPCProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  variant = 'flexing',
  persona = 'guide',
  onInteract,
}) => {
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const [showDialogue, setShowDialogue] = useState(false);
  const [currentDialogue, setCurrentDialogue] = useState(0);
  const [mixer, setMixer] = useState<AnimationMixer | null>(null);

  const modelUrl = BRIAN_MODELS[variant];
  const personaData = BRIAN_PERSONAS[persona];

  // Try to load the model, fallback to primitive if not available
  let scene: any = null;
  let animations: AnimationClip[] = [];
  
  try {
    const gltf = useGLTF(modelUrl);
    scene = gltf.scene;
    animations = gltf.animations;
  } catch {
    // Model not found, will use fallback
  }

  // Setup animation mixer
  useEffect(() => {
    if (scene && animations.length > 0) {
      const newMixer = new AnimationMixer(scene);
      animations.forEach((clip) => {
        newMixer.clipAction(clip).play();
      });
      setMixer(newMixer);
      return () => newMixer.stopAllAction();
    }
  }, [scene, animations]);

  // Animation loop
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Idle hover animation
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      
      // Face player when hovered
      if (hovered) {
        groupRef.current.rotation.y += (0 - groupRef.current.rotation.y) * 0.1;
      }
    }
    
    // Update animation mixer
    if (mixer) {
      mixer.update(delta);
    }
  });

  const handleClick = () => {
    setShowDialogue(true);
    setCurrentDialogue((prev) => (prev + 1) % personaData.dialogues.length);
    onInteract?.();
  };

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Brian Model or Fallback */}
      {scene ? (
        <primitive 
          object={scene.clone()} 
          scale={scale}
          onClick={handleClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        />
      ) : (
        // Fallback: Simple sphere with emoji
        <mesh
          onClick={handleClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          scale={hovered ? scale * 1.1 : scale}
        >
          <sphereGeometry args={[0.8, 32, 32]} />
          <meshStandardMaterial
            color={personaData.color}
            emissive={personaData.color}
            emissiveIntensity={hovered ? 0.5 : 0.2}
            metalness={0.3}
            roughness={0.7}
          />
        </mesh>
      )}

      {/* Name Tag */}
      <Text
        position={[0, 2.5 * scale, 0]}
        fontSize={0.3}
        color={personaData.color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {personaData.title}
      </Text>

      {/* Interaction Indicator */}
      {hovered && !showDialogue && (
        <Text
          position={[0, 2.9 * scale, 0]}
          fontSize={0.2}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          Click to talk!
        </Text>
      )}

      {/* Dialogue Box */}
      {showDialogue && (
        <Html position={[0, 3.5 * scale, 0]} center>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.85)',
              border: `2px solid ${personaData.color}`,
              borderRadius: '12px',
              padding: '16px',
              maxWidth: '300px',
              color: 'white',
              fontFamily: 'system-ui, sans-serif',
            }}
            onClick={() => setShowDialogue(false)}
          >
            <div style={{ 
              fontWeight: 'bold', 
              color: personaData.color, 
              marginBottom: '8px',
              fontSize: '14px',
            }}>
              💪 {personaData.title}
            </div>
            <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
              {personaData.dialogues[currentDialogue]}
            </div>
            <div style={{ 
              fontSize: '10px', 
              color: '#888', 
              marginTop: '8px',
              textAlign: 'center',
            }}>
              Click to close
            </div>
          </div>
        </Html>
      )}

      {/* Glow effect when hovered */}
      {hovered && (
        <pointLight
          position={[0, 1, 0]}
          intensity={0.5}
          distance={3}
          color={personaData.color}
        />
      )}
    </group>
  );
};

// Preload all Brian models
Object.values(BRIAN_MODELS).forEach((url) => {
  try {
    useGLTF.preload(url);
  } catch {
    // Model not available yet
  }
});

export default BrianNPC;
