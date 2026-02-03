import React, { Suspense } from 'react';
import { Splat } from '@react-three/drei';

interface SplatRendererProps {
  src: string;
  opacity?: number;
  scale?: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export const SplatRenderer: React.FC<SplatRendererProps> = ({
  src,
  opacity = 1,
  scale = [1, 1, 1],
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) => {
  if (!src) return null;

  return (
    <Suspense fallback={null}>
      <group position={position} rotation={rotation} scale={scale}>
        <Splat
          src={src}
          opacity={opacity}
        />
      </group>
    </Suspense>
  );
};
