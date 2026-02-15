/**
 * Type declarations for React Three Fiber refs
 * Fixes version conflicts between @types/three versions in monorepo
 */

import * as THREE from 'three';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      grassMaterial: any;
    }
  }
}

// Re-export THREE types for easier use
export type GroupRef = THREE.Group | null;
export type MeshRef = THREE.Mesh | null;
export type Object3DRef = THREE.Object3D | null;

// Helper type to make refs work with R3F
export type R3FRef<T> = React.RefObject<T> | ((instance: T | null) => void) | null;

export {};
