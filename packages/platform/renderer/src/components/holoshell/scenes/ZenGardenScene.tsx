/**
 * ZenGardenScene
 *
 * Sand + leaves + morning light. Calm, contemplative.
 * Raked sand patterns, drifting leaves, soft god rays.
 *
 * @module holoshell/scenes/ZenGardenScene
 */

import React from 'react';
import type { SceneComponentProps } from '../types';
import { SandCanvas } from '../phenomena/SandCanvas';
import { LeafField } from '../phenomena/LeafField';
import { GlowField } from '../phenomena/GlowField';
import { SceneDoor } from '../phenomena/SceneDoor';

const ZenGardenScene: React.FC<SceneComponentProps> = ({
  onNavigateRequest,
  onInteraction,
}) => {
  const handleNavigate = (id: string) => {
    onNavigateRequest?.(id as any);
    onInteraction?.('door_opened', { destination: id });
  };

  return (
    <group>
      {/* Morning sky wash (soft gradient plane) */}
      <mesh position={[0, 3.2, -4.5]} rotation={[0.6, 0, 0]}>
        <planeGeometry args={[18, 9]} />
        <meshBasicMaterial color="#e8d9b8" transparent opacity={0.35} />
      </mesh>

      {/* Large raked sand garden */}
      <SandCanvas
        position={[0, -1.65, -1.2]}
        rotation={[-Math.PI * 0.5, 0, 0]}
        sandColor="#d4c39a"
        isUnderwater={false}
        rakePattern="zen-raked"
        onInteract={(uv) => onInteraction?.('sand_rake', { uv })}
      />

      {/* Drifting leaves (maple / ginkgo) */}
      <LeafField
        position={[0, 1.1, -2.4]}
        count={9}
        driftSpeed={0.09}
        color="#c85d1a"
        wind
        onTouch={(id) => onInteraction?.('leaf_touch', { id })}
      />

      {/* Morning light motes */}
      <GlowField
        position={[-0.8, 0.9, -1.8]}
        color="#ffe8a0"
        pulseRate={0.14}
        intensity={0.42}
        count={18}
      />

      {/* Stone lantern / rock formation with door */}
      <mesh position={[-2.4, -0.6, -2.6]}>
        <cylinderGeometry args={[0.9, 1.1, 1.4, 6]} />
        <meshStandardMaterial color="#555555" roughness={0.98} />
      </mesh>

      <SceneDoor
        position={[-2.35, -0.25, -2.1]}
        materialType="zen_rock"
        destinationScene="MountainLakeScene"
        onNavigate={handleNavigate}
        ariaLabel="Continue to the mountain lake through the stone passage"
      />

      {/* TODO: soft wind chimes + distant temple bell */}
    </group>
  );
};

export default ZenGardenScene;
