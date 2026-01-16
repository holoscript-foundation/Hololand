// Simple player position hook for R3F scenes
// Replace with the actual camera or avatar position from your app
import { useThree } from '@react-three/fiber';
import { useCallback } from 'react';

export function usePlayerPositionGetter() {
  const { camera } = useThree();
  return useCallback(() => {
    return [camera.position.x, camera.position.y, camera.position.z] as [number, number, number];
  }, [camera]);
}
