/**
 * ZenGardenCloseScene
 *
 * Intimate close-up of sand patterns and a single drifting leaf.
 * Final "resting" scene — extremely calm, high detail on micro-phenomena.
 *
 * @module holoshell/scenes/ZenGardenCloseScene
 */

import React from 'react';
import type { SceneComponentProps } from '../types';
import { SandCanvas } from '../phenomena/SandCanvas';
import { LeafField } from '../phenomena/LeafField';
import { GlowField } from '../phenomena/GlowField';
import { SceneDoor } from '../phenomena/SceneDoor';

const ZenGardenCloseScene: React.FC<SceneComponentProps> = ({
  onNavigateRequest,
  onInteraction,
}) => {
  const handleNavigate = (id: string) => {
    onNavigateRequest?.(id as any);
    onInteraction?.('door_opened', { destination: id });
  };

  return (
    <group>
      {/* Tight sand plane (macro view) */}
      <SandCanvas
        position={[0, -1.35, -0.9]}
        rotation={[-Math.PI * 0.5, 0, 0]}
        scale={0.8}
        sandColor="#d8c9a4"
        rakePattern="zen-raked"
        onInteract={(uv) => onInteraction?.('sand_detail', { uv })}
      />

      {/* One prominent, slow leaf — the focal point */}
      <LeafField
        position={[0.3, 0.55, -1.35]}
        count={1}
        driftSpeed={0.045}
        color="#9c5a1f"
        wind={false}
        onTouch={() => onInteraction?.('final_leaf_touch')}
      />

      {/* Very soft light motes (morning dust) */}
      <GlowField
        position={[0, 0.7, -1.6]}
        color="#f5e8b8"
        pulseRate={0.1}
        intensity={0.32}
        count={9}
      />

      {/* Small stone with door (return to start / loop) */}
      <mesh position={[-1.55, -0.9, -1.75]}>
        <dodecahedronGeometry args={[0.55]} />
        <meshStandardMaterial color="#444444" roughness={0.97} />
      </mesh>

      <SceneDoor
        position={[-1.5, -0.55, -1.35]}
        materialType="zen_rock"
        destinationScene="UnderwaterScene"
        onNavigate={handleNavigate}
        ariaLabel="Return through the stone to the underwater world"
      />

      {/* TODO: extremely faint single wind chime tone */}
    </group>
  );
};

export default ZenGardenCloseScene;
