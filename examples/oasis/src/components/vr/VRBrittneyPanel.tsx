import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface VRBrittneyPanelProps {
  messages: Message[];
  isListening: boolean;
  isGenerating: boolean;
  currentTranscript: string;
  position?: [number, number, number];
  followCamera?: boolean;
}

/**
 * Floating VR panel for Brittney AI assistant
 * Shows conversation history and current voice input
 */
export default function VRBrittneyPanel({
  messages,
  isListening,
  isGenerating,
  currentTranscript,
  position = [-1.5, 1.5, -2],
  followCamera = true,
}: VRBrittneyPanelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const targetPositionRef = useRef(new THREE.Vector3(...position));

  // Smoothly follow camera
  useFrame(({ camera }) => {
    if (!groupRef.current || !followCamera) return;

    // Calculate position in front of and to the left of the camera
    const offset = new THREE.Vector3(-0.8, 0.2, -1.5);
    offset.applyQuaternion(camera.quaternion);
    targetPositionRef.current.copy(camera.position).add(offset);

    // Smooth interpolation
    groupRef.current.position.lerp(targetPositionRef.current, 0.05);

    // Face the camera
    groupRef.current.lookAt(camera.position);
  });

  // Get last few messages to display
  const displayMessages = messages.slice(-4);

  return (
    <group ref={groupRef} position={position}>
      {/* Panel background */}
      <RoundedBox args={[1.2, 0.8, 0.02]} radius={0.03} smoothness={4}>
        <meshStandardMaterial
          color="#FFF8E7"
          transparent
          opacity={0.95}
          roughness={0.3}
        />
      </RoundedBox>

      {/* Header */}
      <group position={[0, 0.32, 0.02]}>
        {/* Brittney icon */}
        <mesh position={[-0.45, 0, 0]}>
          <circleGeometry args={[0.06, 32]} />
          <meshStandardMaterial color="#7CB342" />
        </mesh>

        <Text
          position={[-0.25, 0, 0]}
          fontSize={0.06}
          color="#3D2914"
          anchorX="left"
          font="/fonts/Inter-Bold.woff"
        >
          Brittney
        </Text>

        {/* Status indicator */}
        <mesh position={[0.5, 0, 0]}>
          <circleGeometry args={[0.025, 16]} />
          <meshStandardMaterial
            color={isListening ? '#43A047' : isGenerating ? '#FFD54F' : '#6B5344'}
            emissive={isListening ? '#43A047' : isGenerating ? '#FFD54F' : '#000000'}
            emissiveIntensity={isListening || isGenerating ? 0.5 : 0}
          />
        </mesh>
      </group>

      {/* Divider */}
      <mesh position={[0, 0.24, 0.02]}>
        <planeGeometry args={[1.1, 0.002]} />
        <meshBasicMaterial color="#D2691E" opacity={0.3} transparent />
      </mesh>

      {/* Messages */}
      <group position={[0, 0.1, 0.02]}>
        {displayMessages.map((msg, i) => (
          <group key={i} position={[0, -i * 0.12, 0]}>
            <Text
              position={[-0.5, 0, 0]}
              fontSize={0.035}
              color={msg.role === 'user' ? '#5DADE2' : '#7CB342'}
              anchorX="left"
              maxWidth={1}
            >
              {msg.role === 'user' ? 'You' : 'Brittney'}:
            </Text>
            <Text
              position={[-0.5, -0.04, 0]}
              fontSize={0.03}
              color="#3D2914"
              anchorX="left"
              maxWidth={1}
              textAlign="left"
            >
              {truncateText(msg.content, 80)}
            </Text>
          </group>
        ))}
      </group>

      {/* Current transcript (when listening) */}
      {isListening && currentTranscript && (
        <group position={[0, -0.3, 0.02]}>
          <RoundedBox args={[1.1, 0.1, 0.01]} radius={0.02} smoothness={4} position={[0, 0, -0.005]}>
            <meshStandardMaterial color="#87CEEB" transparent opacity={0.3} />
          </RoundedBox>
          <Text
            fontSize={0.035}
            color="#3D2914"
            maxWidth={1}
            textAlign="center"
          >
            {currentTranscript}
          </Text>
        </group>
      )}

      {/* Listening indicator */}
      {isListening && (
        <group position={[0, -0.35, 0.02]}>
          <ListeningWave />
        </group>
      )}

      {/* Generating indicator */}
      {isGenerating && (
        <group position={[0, -0.35, 0.02]}>
          <Text fontSize={0.03} color="#FFD54F">
            Thinking...
          </Text>
          <ThinkingDots />
        </group>
      )}
    </group>
  );
}

/**
 * Animated wave visualization for listening state
 */
function ListeningWave() {
  const barsRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!barsRef.current) return;

    barsRef.current.children.forEach((bar, i) => {
      const scale = 0.5 + Math.sin(clock.elapsedTime * 8 + i * 0.5) * 0.5;
      bar.scale.y = scale;
    });
  });

  return (
    <group ref={barsRef}>
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} position={[(i - 2) * 0.03, 0, 0]}>
          <boxGeometry args={[0.015, 0.04, 0.01]} />
          <meshStandardMaterial color="#43A047" />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Animated thinking dots
 */
function ThinkingDots() {
  const dotsRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!dotsRef.current) return;

    dotsRef.current.children.forEach((dot, i) => {
      const bounce = Math.sin(clock.elapsedTime * 4 + i * 0.8) * 0.01;
      dot.position.y = bounce;
    });
  });

  return (
    <group ref={dotsRef} position={[0.15, 0, 0]}>
      {Array.from({ length: 3 }).map((_, i) => (
        <mesh key={i} position={[i * 0.025, 0, 0]}>
          <sphereGeometry args={[0.008, 8, 8]} />
          <meshStandardMaterial color="#FFD54F" />
        </mesh>
      ))}
    </group>
  );
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
