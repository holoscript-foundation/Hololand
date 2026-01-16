// R3F Layer to handle proximity-based Easter Egg discovery
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EasterEgg, getEggsByZone, registerEggDiscovery } from './eggs';

export interface EasterEggsProximityLayerProps {
  zone: 'welcome_plaza' | 'builder_shop' | 'casino' | 'green_machine_arcade' | 'b2b_hub' | 'brians_gym' | 'central_park';
  userId: string;
  themeName?: string; // optional: filter eggs by theme variants
  getPlayerPosition: () => [number, number, number];
  debug?: boolean; // render spheres for debugging
}

export const EasterEggsProximityLayer: React.FC<EasterEggsProximityLayerProps> = ({
  zone,
  userId,
  themeName,
  getPlayerPosition,
  debug = false,
}) => {
  const eggs = useMemo<EasterEgg[]>(() => getEggsByZone(zone), [zone]);
  const discoveredRef = useRef<Set<string>>(new Set());

  // Precompute proximity triggers
  const proximityTriggers = useMemo(
    () =>
      eggs
        .map((egg) =>
          egg.triggers
            .filter((t) => t.type === 'proximity' && t.radius && t.position)
            .map((t) => ({ egg, radius: t.radius!, position: t.position! }))
        )
        .flat(),
    [eggs]
  );

  useFrame(() => {
    const playerPosArr = getPlayerPosition();
    const playerPos = new THREE.Vector3(playerPosArr[0], playerPosArr[1], playerPosArr[2]);

    for (const { egg, radius, position } of proximityTriggers) {
      if (themeName && egg.themeVariants && egg.themeVariants.length > 0) {
        // If egg has themeVariants and current theme is not included, skip
        if (!egg.themeVariants.includes(themeName)) continue;
      }
      if (discoveredRef.current.has(egg.id)) continue;

      const triggerPos = new THREE.Vector3(position[0], position[1], position[2]);
      const distance = playerPos.distanceTo(triggerPos);
      if (distance <= radius) {
        discoveredRef.current.add(egg.id);
        registerEggDiscovery(egg.id, userId).catch(() => {});
        // eslint-disable-next-line no-console
        console.info('[easter-egg] proximity discovered', egg.id);
      }
    }
  });

  // Debug render of proximity spheres
  if (!debug) return null;

  return (
    <group>
      {proximityTriggers.map(({ egg, radius, position }) => (
        <mesh key={`egg-proxy-${egg.id}`} position={position}>
          <sphereGeometry args={[radius, 16, 16]} />
          <meshBasicMaterial color="hotpink" transparent opacity={0.15} />
        </mesh>
      ))}
    </group>
  );
};
