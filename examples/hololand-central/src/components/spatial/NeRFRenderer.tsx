import React, { useMemo } from 'react';
import { extend } from '@react-three/fiber';
import { LumaSplatsThree } from '@lumaai/luma-web';

// Extend R3F with LumaSplatsThree
extend({ LumaSplats: LumaSplatsThree });

// Add types for JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      lumaSplats: any;
    }
  }
}

interface NeRFRendererProps {
  src: string;
  quality?: 'high' | 'medium' | 'low';
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

export const NeRFRenderer: React.FC<NeRFRendererProps> = ({
  src,
  quality = 'medium',
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
}) => {
  if (!src) return null;

  // Luma expects a URL like https://lumalabs.ai/capture/UUID
  // or a direct link to the splat file.
  return (
    <lumaSplats
      source={src}
      loadingAnimationEnabled={true}
      position={position}
      rotation={rotation}
      scale={scale}
      // Quality mapping if needed, though Luma handle most of it
    />
  );
};
