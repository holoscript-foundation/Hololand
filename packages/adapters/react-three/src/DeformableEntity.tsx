import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';

export interface DeformableEntityProps {
  children: React.ReactNode;
  moldable?: boolean;
  stretchable?: boolean;
}

/**
 * DeformableEntity
 *
 * Provides interactive deformation for meshes.
 * @moldable: Allows "sculpting" by clicking/grabbing.
 * @stretchable: Allows elastic scaling along interaction axes.
 */
export const DeformableEntity: React.FC<DeformableEntityProps> = ({
  children,
  moldable,
  stretchable,
}) => {
  const groupRef = useRef<Group>(null);
  const [deformation, setDeformation] = useState(0);

  useFrame((state) => {
    if (!groupRef.current) return;

    if (moldable || stretchable) {
      const breathe = Math.sin(state.clock.elapsedTime * 2) * 0.02;
      const scale = 1 + breathe + deformation;
      groupRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group
      ref={groupRef}
      onPointerOver={() => moldable && setDeformation(0.1)}
      onPointerOut={() => setDeformation(0)}
    >
      {children}
    </group>
  );
};
