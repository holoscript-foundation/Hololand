/**
 * XR Teleport Component
 * 
 * Teleportation locomotion for VR environments
 */

import { useRef, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useXRControllers } from '../hooks/useXRControllers';
import * as THREE from 'three';

interface XRTeleportProps {
  playerRef: React.RefObject<THREE.Group>;
  floorHeight?: number;
  maxDistance?: number;
  curvePoints?: number;
}

export function XRTeleport({
  playerRef,
  floorHeight = 0,
  maxDistance = 10,
  curvePoints = 30,
}: XRTeleportProps) {
  const { right, isPresenting } = useXRControllers();
  const [teleportTarget, setTeleportTarget] = useState<THREE.Vector3 | null>(null);
  const [showArc, setShowArc] = useState(false);
  
  const arcPoints = useRef<THREE.Vector3[]>([]);
  const raycaster = useRef(new THREE.Raycaster());
  const tempVec = useRef(new THREE.Vector3());

  // Calculate teleport arc
  const calculateArc = useCallback((
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    velocity: number = 5
  ): THREE.Vector3[] => {
    const points: THREE.Vector3[] = [];
    const gravity = 9.8;
    const timeStep = 0.05;
    
    const pos = origin.clone();
    const vel = direction.clone().multiplyScalar(velocity);
    
    for (let i = 0; i < curvePoints; i++) {
      points.push(pos.clone());
      
      // Physics step
      vel.y -= gravity * timeStep;
      pos.add(vel.clone().multiplyScalar(timeStep));
      
      // Check if hit floor
      if (pos.y <= floorHeight) {
        pos.y = floorHeight;
        points.push(pos.clone());
        break;
      }
      
      // Max distance check
      if (pos.distanceTo(origin) > maxDistance) {
        break;
      }
    }
    
    return points;
  }, [curvePoints, floorHeight, maxDistance]);

  useFrame(() => {
    if (!isPresenting || !right || !playerRef.current) {
      setShowArc(false);
      return;
    }

    // Show arc when thumbstick pressed up
    if (right.thumbstick.y < -0.5) {
      setShowArc(true);
      
      // Calculate arc from controller
      const origin = right.position.clone();
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyQuaternion(right.rotation);
      
      const points = calculateArc(origin, forward);
      arcPoints.current = points;
      
      // Set target to last point
      if (points.length > 0) {
        setTeleportTarget(points[points.length - 1]);
      }
    } else {
      // Teleport on release
      if (showArc && teleportTarget) {
        // Instant teleport
        playerRef.current.position.x = teleportTarget.x;
        playerRef.current.position.z = teleportTarget.z;
        
        // Fade effect could be added here
      }
      
      setShowArc(false);
      setTeleportTarget(null);
    }
  });

  if (!showArc || !isPresenting) return null;

  return (
    <>
      {/* Teleport Arc Line */}
      {arcPoints.current.length > 1 && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={arcPoints.current.length}
              array={new Float32Array(arcPoints.current.flatMap(p => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#4ade80" linewidth={2} transparent opacity={0.8} />
        </line>
      )}
      
      {/* Target Marker */}
      {teleportTarget && (
        <group position={teleportTarget}>
          {/* Ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.3, 0.4, 32]} />
            <meshBasicMaterial color="#4ade80" transparent opacity={0.8} />
          </mesh>
          
          {/* Inner glow */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.3, 32]} />
            <meshBasicMaterial color="#4ade80" transparent opacity={0.3} />
          </mesh>
        </group>
      )}
    </>
  );
}

export default XRTeleport;
