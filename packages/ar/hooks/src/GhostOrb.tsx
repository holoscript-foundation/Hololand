/**
 * GhostOrb — R3F component rendering a UAA2 agent as a glowing orb with trail
 *
 * Each agent's phase maps to a color:
 *   INTAKE → cyan, REFLECT → violet, EXECUTE → green,
 *   COMPRESS → amber, RE-INTAKE → teal, GROW → lime, EVOLVE → magenta
 *
 * The orb pulses gently, has a point light for ambient glow,
 * and renders a fading trail of recent positions.
 *
 * @module ar-hooks
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import { Vector3 } from 'three';
import type { AgentState } from './useLiveBridge';

// ─── Phase Colors ───────────────────────────────────────────────────────────

const PHASE_COLORS: Record<string, string> = {
  INTAKE: '#00e5ff',
  REFLECT: '#aa00ff',
  EXECUTE: '#00e676',
  COMPRESS: '#ffab00',
  'RE-INTAKE': '#00bfa5',
  GROW: '#aeea00',
  EVOLVE: '#d500f9',
  // Fallbacks for status-based coloring
  active: '#00e5ff',
  idle: '#607d8b',
  error: '#ff1744',
  complete: '#00c853',
};

function getColor(agent: AgentState): string {
  return PHASE_COLORS[agent.phase ?? ''] ?? PHASE_COLORS[agent.status] ?? '#607d8b';
}

// ─── Trail Ring Buffer ──────────────────────────────────────────────────────

const MAX_TRAIL = 20;

// ─── Component ──────────────────────────────────────────────────────────────

export interface GhostOrbProps {
  agent: AgentState;
  /** Scale multiplier. Default 1. */
  scale?: number;
  /** Show agent label. Default true. */
  showLabel?: boolean;
  /** Trail length (0 to disable). Default 12. */
  trailLength?: number;
  /** Pulse speed multiplier. Default 1. */
  pulseSpeed?: number;
  /** Opacity. Default 0.85. */
  opacity?: number;
}

export function GhostOrb({
  agent,
  scale = 1,
  showLabel = true,
  trailLength = 12,
  pulseSpeed = 1,
  opacity = 0.85,
}: GhostOrbProps) {
  // Use 'any' for R3F refs to avoid cross-package @types/three conflicts in monorepos
  const meshRef = useRef<any>(null);
  const lightRef = useRef<any>(null);
  const trailRef = useRef<Array<{ x: number; y: number; z: number }>>([]);

  const color = useMemo(() => getColor(agent), [agent.phase, agent.status]);

  const pos = agent.position;

  // Record trail positions
  const trail = trailRef.current;
  if (
    trail.length === 0 ||
    Math.abs(trail[trail.length - 1].x - pos.x) > 0.01 ||
    Math.abs(trail[trail.length - 1].y - pos.y) > 0.01 ||
    Math.abs(trail[trail.length - 1].z - pos.z) > 0.01
  ) {
    trail.push({ ...pos });
    if (trail.length > MAX_TRAIL) trail.shift();
  }

  // Animate pulse
  useFrame((state) => {
    if (!meshRef.current) return;

    const t = state.clock.getElapsedTime() * pulseSpeed;
    const pulse = 1 + Math.sin(t * 2) * 0.08;
    const s = scale * 0.15 * pulse;
    meshRef.current.scale.set(s, s, s);

    // Smooth position lerp
    meshRef.current.position.lerp(
      new Vector3(pos.x, pos.y, pos.z),
      0.15,
    );

    // Light follows
    if (lightRef.current) {
      lightRef.current.position.copy(meshRef.current.position);
    }
  });

  // Build trail geometry points
  const trailPoints = useMemo(() => {
    const len = Math.min(trail.length, trailLength);
    if (len < 2) return null;
    const pts = trail.slice(-len).map((p) => new Vector3(p.x, p.y, p.z));
    return pts;
  }, [trail.length, trailLength]);

  return (
    <group>
      {/* Main orb */}
      <mesh ref={meshRef} position={[pos.x, pos.y, pos.z]}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.5}
          transparent
          opacity={opacity}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>

      {/* Glow light */}
      <pointLight
        ref={lightRef}
        color={color}
        intensity={0.8 * scale}
        distance={3 * scale}
        decay={2}
        position={[pos.x, pos.y, pos.z]}
      />

      {/* Trail line */}
      {trailPoints && trailPoints.length >= 2 && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array(trailPoints.flatMap((p) => [p.x, p.y, p.z]))}
              count={trailPoints.length}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={color}
            transparent
            opacity={0.3}
            linewidth={1}
          />
        </line>
      )}

      {/* Label */}
      {showLabel && (
        <Billboard
          follow
          position={[pos.x, pos.y + 0.25 * scale, pos.z]}
        >
          <Text
            fontSize={0.06 * scale}
            color={color}
            anchorX="center"
            anchorY="bottom"
          >
            {agent.type || agent.id}
          </Text>
        </Billboard>
      )}
    </group>
  );
}
