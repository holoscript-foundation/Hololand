import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { useNetwork } from './NetworkContext';

export interface SyncedEntityProps {
  id: string;
  children: React.ReactNode;
  syncRate?: number; // Hz
}

/**
 * SyncedEntity
 * 
 * Wraps a component to sync its transform across the network.
 * Uses StateSync for interpolation and prediction.
 */
export const SyncedEntity: React.FC<SyncedEntityProps> = ({ id, children, syncRate = 20 }) => {
  const { client, sync, isConnected } = useNetwork();
  const groupRef = useRef<Group>(null);
  const lastSyncTime = useRef(0);

  // 1. Sending local state to network
  useFrame((state) => {
    if (!isConnected || !client || !groupRef.current) return;

    const now = state.clock.elapsedTime * 1000;
    if (now - lastSyncTime.current > (1000 / syncRate)) {
      const position = groupRef.current.position;
      const rotation = groupRef.current.rotation;
      
      client.send({
        type: 'state_update',
        category: 'room',
        payload: {
          objectId: id,
          position: { x: position.x, y: position.y, z: position.z },
          rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
          timestamp: Date.now()
        },
        timestamp: Date.now()
      });
      
      lastSyncTime.current = now;
    }
  });

  // 2. Applying remote state from network
  useFrame(() => {
    if (!sync || !groupRef.current) return;

    const networkedState = sync.getInterpolatedState(id);
    if (networkedState && networkedState.position) {
      groupRef.current.position.set(
        networkedState.position.x,
        networkedState.position.y,
        networkedState.position.z
      );
      if (networkedState.rotation) {
        groupRef.current.rotation.set(
          networkedState.rotation.x,
          networkedState.rotation.y,
          networkedState.rotation.z
        );
      }
    }
  });

  return (
    <group ref={groupRef}>
      {children}
    </group>
  );
};
