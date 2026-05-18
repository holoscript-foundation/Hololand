/**
 * WarmLibraryScene
 *
 * Fireplace + bookshelves + floating dust motes (GlowField).
 * Cozy, scholarly, slow-moving. Door embedded in bookshelf gap.
 *
 * @module holoshell/scenes/WarmLibraryScene
 */

import React from 'react';
import type { SceneComponentProps } from '../types';
import { FireSource } from '../phenomena/FireSource';
import { GlowField } from '../phenomena/GlowField';
import { LeafField } from '../phenomena/LeafField';
import { SceneDoor } from '../phenomena/SceneDoor';

const WarmLibraryScene: React.FC<SceneComponentProps> = ({
  onNavigateRequest,
  onInteraction,
}) => {
  const handleNavigate = (id: string) => {
    onNavigateRequest?.(id as any);
    onInteraction?.('door_opened', { destination: id });
  };

  return (
    <group>
      {/* Warm wood back wall (bookshelf plane) */}
      <mesh position={[0, 0.2, -3.1]}>
        <planeGeometry args={[12, 7]} />
        <meshStandardMaterial color="#3a2a1f" roughness={0.92} />
      </mesh>

      {/* Simple bookshelf rows (horizontal boxes) */}
      {[ -1.2, 0.1, 1.4 ].map((y, idx) => (
        <mesh key={idx} position={[0, y, -2.95]}>
          <boxGeometry args={[9.5, 0.22, 0.6]} />
          <meshStandardMaterial color="#2f241a" roughness={0.88} />
        </mesh>
      ))}

      {/* Fireplace brick surround */}
      <mesh position={[0, -0.9, -2.7]}>
        <boxGeometry args={[3.8, 2.6, 0.8]} />
        <meshStandardMaterial color="#3f2f28" roughness={0.96} />
      </mesh>

      {/* Fire — heart of the scene */}
      <FireSource
        position={[0, -1.15, -2.35]}
        intensity={0.95}
        embers
        onProximity={(d) => onInteraction?.('fire_proximity', { distance: d })}
      />

      {/* Dust motes / ember glow in warm light */}
      <GlowField
        position={[0.4, 0.6, -2.1]}
        color="#ffcc66"
        pulseRate={0.18}
        intensity={0.5}
        count={22}
      />

      {/* Slow drifting "page" leaves / paper scraps */}
      <LeafField
        position={[-1.6, 0.9, -2.0]}
        count={5}
        driftSpeed={0.08}
        color="#d2b48c"
        wind
        onTouch={(id) => onInteraction?.('leaf_touch', { id })}
      />

      {/* Door set into the bookshelf wall */}
      <SceneDoor
        position={[2.8, -0.35, -2.65]}
        materialType="bookshelf"
        destinationScene="ZenGardenScene"
        onNavigate={handleNavigate}
        ariaLabel="Leave the library through the bookshelf passage"
      />

      {/* TODO: crackling fire ambience + distant page turning */}
    </group>
  );
};

export default WarmLibraryScene;
