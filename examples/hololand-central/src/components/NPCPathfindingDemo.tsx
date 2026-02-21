/**
 * NPC Pathfinding Demo Component
 * 
 * Demonstrates @holoscript/navigation FlowFieldGenerator with wandering NPCs
 */

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { FlowFieldGenerator } from '@hololand/navigation';
import * as THREE from 'three';

interface NPC {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  mesh: THREE.Mesh;
}

interface NPCPathfindingDemoProps {
  npcCount?: number;
  goalPosition?: [number, number, number];
}

export function NPCPathfindingDemo({
  npcCount = 10,
  goalPosition = [0, 0, 0],
}: NPCPathfindingDemoProps) {
  const groupRef = useRef<THREE.Group>(null);
  const npcsRef = useRef<NPC[]>([]);
  
  // Create flow field generator
  const flowField = useMemo(() => {
    const ff = new FlowFieldGenerator({
      cellSize: 1.0,
      width: 32,
      height: 32,
      allowDiagonal: true,
    });
    
    // Set goal (offset to center of grid)
    ff.setGoal(goalPosition[0] + 16, goalPosition[2] + 16);
    
    // Add some obstacles
    ff.addObstacle(5 + 16, 5 + 16);
    ff.addObstacle(6 + 16, 5 + 16);
    ff.addObstacle(7 + 16, 5 + 16);
    ff.addObstacle(-3 + 16, 2 + 16);
    ff.addObstacle(-3 + 16, 3 + 16);
    
    ff.update();
    
    return ff;
  }, [goalPosition]);
  
  // Initialize NPCs
  useEffect(() => {
    npcsRef.current = [];
    
    for (let i = 0; i < npcCount; i++) {
      // Random starting position
      const x = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 20;
      
      const geometry = new THREE.CapsuleGeometry(0.3, 0.8, 4, 8);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5),
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, 0.7, z);
      
      groupRef.current?.add(mesh);
      
      npcsRef.current.push({
        id: `npc_${i}`,
        position: new THREE.Vector3(x, 0, z),
        velocity: new THREE.Vector3(),
        mesh,
      });
    }
    
    return () => {
      npcsRef.current.forEach(npc => {
        groupRef.current?.remove(npc.mesh);
        npc.mesh.geometry.dispose();
        (npc.mesh.material as THREE.Material).dispose();
      });
    };
  }, [npcCount]);
  
  // Update NPCs each frame
  useFrame((_, delta) => {
    const speed = 2.0;
    const arrivalDistance = 1.0;
    
    npcsRef.current.forEach(npc => {
      // Get flow direction at NPC position (offset for grid centering)
      const gridX = npc.position.x + 16;
      const gridZ = npc.position.z + 16;
      const flowDir = flowField.getVector(gridX, gridZ);
      
      // Calculate distance to goal
      const dx = goalPosition[0] - npc.position.x;
      const dz = goalPosition[2] - npc.position.z;
      const distToGoal = Math.sqrt(dx * dx + dz * dz);
      
      // Apply flow field velocity
      if (distToGoal > arrivalDistance) {
        const targetVelX = flowDir.x * speed;
        const targetVelZ = flowDir.y * speed; // flowDir.y is z in our 2D grid
        
        // Smooth velocity
        npc.velocity.x += (targetVelX - npc.velocity.x) * 0.1;
        npc.velocity.z += (targetVelZ - npc.velocity.z) * 0.1;
        
        // Update position
        npc.position.x += npc.velocity.x * delta;
        npc.position.z += npc.velocity.z * delta;
        
        // Update mesh
        npc.mesh.position.x = npc.position.x;
        npc.mesh.position.z = npc.position.z;
        
        // Rotate to face direction
        if (npc.velocity.lengthSq() > 0.01) {
          const angle = Math.atan2(npc.velocity.x, npc.velocity.z);
          npc.mesh.rotation.y = angle;
        }
      }
    });
  });
  
  return (
    <group ref={groupRef}>
      {/* Goal marker */}
      <mesh position={[goalPosition[0], 0.1, goalPosition[2]]}>
        <cylinderGeometry args={[0.5, 0.5, 0.2, 16]} />
        <meshStandardMaterial color="#4ade80" emissive="#4ade80" emissiveIntensity={0.5} />
      </mesh>
      
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[32, 32]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      
      {/* Grid visualization */}
      <gridHelper args={[32, 32, '#334155', '#1e293b']} position={[0, 0.01, 0]} />
    </group>
  );
}

export default NPCPathfindingDemo;
