import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Vector3, Mesh } from 'three';

interface PlayerControllerProps {
  avatarUrl: string;
  onPositionUpdate?: (pos: Vector3) => void;
  onInteract?: () => void;
}

export const PlayerController: React.FC<PlayerControllerProps> = ({ avatarUrl, onPositionUpdate, onInteract }) => {
  const groupRef = useRef<Mesh>(null);
  
  // State for keys
  const [keys, setKeys] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => setKeys(prev => ({ ...prev, [e.key.toLowerCase()]: true }));
    const handleUp = (e: KeyboardEvent) => {
        setKeys(prev => ({ ...prev, [e.key.toLowerCase()]: false }));
        if (e.key.toLowerCase() === 'e' && onInteract) onInteract();
    };
    
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, [onInteract]);

  // Load Avatar Model
  const { scene } = useGLTF(avatarUrl);
  const { gl } = useThree();
  const isPresenting = (gl.xr as any).isPresenting;

  useFrame((state, delta) => {
    if (!groupRef.current || isPresenting) return;

    const moveSpeed = 5 * delta;
    const rotateSpeed = 2 * delta;
    
    // 1. Handle Input & Rotation
    if (keys['a']) groupRef.current.rotation.y += rotateSpeed;
    if (keys['d']) groupRef.current.rotation.y -= rotateSpeed;

    // 2. Handle Movement
    const direction = new Vector3();
    if (keys['w']) direction.z = -1;
    if (keys['s']) direction.z = 1;

    direction.applyQuaternion(groupRef.current.quaternion);
    groupRef.current.position.addScaledVector(direction, moveSpeed);

    // 3. Camera Follow (Third Person)
    const idealOffset = new Vector3(0, 3, 6);
    idealOffset.applyQuaternion(groupRef.current.quaternion);
    idealOffset.add(groupRef.current.position);
    
    const idealLookAt = new Vector3(0, 1, -2);
    idealLookAt.applyQuaternion(groupRef.current.quaternion);
    idealLookAt.add(groupRef.current.position);

    state.camera.position.lerp(idealOffset, 0.1);
    state.camera.lookAt(idealLookAt);

    // 4. Update parent if needed
    if (onPositionUpdate) onPositionUpdate(groupRef.current.position);
  });

  return (
    <group ref={groupRef as any} position={[0, 0, 10]}>
      {/* Visual Avatar */}
      <primitive 
        object={scene} 
        scale={0.8} 
        rotation={[0, Math.PI, 0]} // Face forward
        position={[0, 0, 0]}
      />
      {/* Interactive Range Indicator */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.5, 2.6, 32]} />
        <meshBasicMaterial color="#4ade80" transparent opacity={0.3} />
      </mesh>
    </group>
  );
};
