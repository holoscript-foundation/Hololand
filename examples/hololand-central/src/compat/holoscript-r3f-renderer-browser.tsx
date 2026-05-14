import React from 'react';

export function getGeometry(node: { type?: string } = {}) {
  if (node.type === 'sphere') return <sphereGeometry args={[1, 32, 16]} />;
  if (node.type === 'plane') return <planeGeometry args={[1, 1]} />;
  return <boxGeometry args={[1, 1, 1]} />;
}

export function getMaterialProps(node: { metadata?: Record<string, unknown> } = {}) {
  return {
    color: Number(node.metadata?.color ?? 0x8ab4f8),
    metalness: Number(node.metadata?.metalness ?? 0.1),
    roughness: Number(node.metadata?.roughness ?? 0.6),
  };
}

export function hasShaderTrait(): boolean {
  return false;
}

export function hasLOD(): boolean {
  return false;
}

export const ShaderMeshNode: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <group>{children}</group>
);

export const AnimatedMeshNode: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <group>{children}</group>
);

export const LODMeshNode: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <group>{children}</group>
);
