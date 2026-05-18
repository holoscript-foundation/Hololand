/**
 * NightCampfireScene
 *
 * Fire + floating embers + stars. Dark, primal, warm center.
 * Primary light source is the fire itself.
 *
 * @module holoshell/scenes/NightCampfireScene
 */

import React from 'react';
import type { SceneComponentProps } from '../types';
import { FireSource } from '../phenomena/FireSource';
import { GlowField } from '../phenomena/GlowField';
import { SceneDoor } from '../phenomena/SceneDoor';

const NightCampfireScene: React.FC<SceneComponentProps> = ({
  onNavigateRequest,
  onInteraction,
}) => {
  const handleNavigate = (id: string) => {
    onNavigateRequest?.(id as any);
    onInteraction?.('door_opened', { destination: id });
  };

  return (
    <group>
      {/* Night sky dome (very dark) */}
      <mesh position={[0, 4, -5]}>
        <sphereGeometry args={[12, 16, 12]} />
        <meshBasicMaterial color="#0a0c14" side={1} />
      </mesh>

      {/* Stars (tiny white points) */}
      <GlowField
        position={[0, 3.5, -4.5]}
        color="#f0f4ff"
        pulseRate={0.05}
        intensity={0.95}
        count={38}
      />

      {/* Central campfire (main light) */}
      <FireSource
        position={[0, -1.35, -1.8]}
        intensity={1.05}
        colorTemp={0.65}
        embers
        onProximity={(d) => onInteraction?.('fire_proximity', { distance: d })}
      />

      {/* Embers / sparks rising high */}
      <GlowField
        position={[0.1, 0.4, -1.9]}
        color="#ff9933"
        pulseRate={0.6}
        intensity={0.7}
        count={16}
      />

      {/* Ring of stones around fire */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 1.35, -1.55, -1.8 + Math.sin(a) * 1.1]}
          >
            <sphereGeometry args={[0.28]} />
            <meshStandardMaterial color="#2a2826" roughness={0.99} />
          </mesh>
        );
      })}

      {/* Door in the darkness (ring of stones leads here) */}
      <SceneDoor
        position={[3.2, -0.9, -2.6]}
        materialType="campfire_ring"
        destinationScene="ZenGardenCloseScene"
        onNavigate={handleNavigate}
        ariaLabel="Step away from the fire into the quiet garden close-up"
      />

      {/* TODO: crackle, owl call, wood pop sounds */}
    </group>
  );
};

export default NightCampfireScene;
