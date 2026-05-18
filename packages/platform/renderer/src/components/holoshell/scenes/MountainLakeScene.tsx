/**
 * MountainLakeScene
 *
 * Still water + distant peaks + mist. Peaceful, vast, reflective.
 * Minimal interaction — mostly contemplative.
 *
 * @module holoshell/scenes/MountainLakeScene
 */

import React from 'react';
import type { SceneComponentProps } from '../types';
import { WaterSurface } from '../phenomena/WaterSurface';
import { GlowField } from '../phenomena/GlowField';
import { SceneDoor } from '../phenomena/SceneDoor';

const MountainLakeScene: React.FC<SceneComponentProps> = ({
  onNavigateRequest,
  onInteraction,
}) => {
  const handleNavigate = (id: string) => {
    onNavigateRequest?.(id as any);
    onInteraction?.('door_opened', { destination: id });
  };

  return (
    <group>
      {/* Distant mountain silhouettes (simple layered planes) */}
      <mesh position={[-3.5, 1.8, -6.5]} rotation={[0.15, 0.4, 0]}>
        <planeGeometry args={[7, 5]} />
        <meshBasicMaterial color="#3a4652" transparent opacity={0.9} />
      </mesh>
      <mesh position={[2.8, 2.4, -7.2]} rotation={[0.1, -0.35, 0]}>
        <planeGeometry args={[8, 6]} />
        <meshBasicMaterial color="#2f3a44" transparent opacity={0.85} />
      </mesh>

      {/* Mirror-still lake water */}
      <WaterSurface
        position={[0, 0.4, -2.2]}
        rotation={[-Math.PI * 0.49, 0, 0]}
        color="#0e3a5a"
        lightRays={false}
        rayCount={3}
        rayOpacity={0.15}
        caustics={false}
      />

      {/* Mist / low cloud glow */}
      <GlowField
        position={[0, 1.8, -3.8]}
        color="#c8d8e8"
        pulseRate={0.08}
        intensity={0.35}
        count={24}
      />

      {/* Stone jetty / arch with door */}
      <mesh position={[2.6, -1.1, -2.4]}>
        <boxGeometry args={[1.8, 0.6, 3.2]} />
        <meshStandardMaterial color="#4a4f55" roughness={0.97} />
      </mesh>

      <SceneDoor
        position={[2.55, -0.55, -2.0]}
        materialType="stone_arch"
        destinationScene="NightCampfireScene"
        onNavigate={handleNavigate}
        ariaLabel="Cross the lake threshold into the night camp"
      />

      {/* TODO: very faint water lapping + high altitude wind */}
    </group>
  );
};

export default MountainLakeScene;
