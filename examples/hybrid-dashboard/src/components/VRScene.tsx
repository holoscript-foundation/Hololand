/**
 * 3D VR Scene Component
 *
 * Renders data visualizations in 3D using Three.js
 * Supports both desktop and VR modes
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { DashboardData } from '../App';

interface VRSceneProps {
  data: DashboardData;
  vrMode: 'desktop' | 'vr';
  onExitVR: () => void;
}

// Bar Chart Visualization
const BarChart: React.FC<{ data: DashboardData }> = ({ data }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current && data.animate) {
      groupRef.current.rotation.y += 0.01;
    }
  });

  const bars = useMemo(() => {
    const result = [];
    const spacing = 1.5;
    const offset = ((data.dataPoints - 1) * spacing) / 2;

    for (let i = 0; i < data.dataPoints; i++) {
      const height = Math.random() * 3 + 1;
      result.push({
        id: i,
        position: new THREE.Vector3(i * spacing - offset, height / 2, 0),
        height,
      });
    }
    return result;
  }, [data.dataPoints]);

  return (
    <group ref={groupRef}>
      {bars.map((bar) => (
        <mesh key={bar.id} position={bar.position}>
          <boxGeometry args={[1, bar.height, 1]} />
          <meshStandardMaterial color={data.color} />
        </mesh>
      ))}
    </group>
  );
};

// Sphere Cloud Visualization
const SphereCloud: React.FC<{ data: DashboardData }> = ({ data }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current && data.animate) {
      groupRef.current.rotation.y += 0.005;
      groupRef.current.rotation.x += 0.002;
    }
  });

  const spheres = useMemo(() => {
    const result = [];
    for (let i = 0; i < data.dataPoints; i++) {
      const angle = (i / data.dataPoints) * Math.PI * 2;
      const radius = 5 + Math.random() * 3;
      const height = (Math.random() - 0.5) * 4;

      result.push({
        id: i,
        position: new THREE.Vector3(
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        ),
        scale: Math.random() * 0.5 + 0.5,
      });
    }
    return result;
  }, [data.dataPoints]);

  return (
    <group ref={groupRef}>
      {spheres.map((sphere) => (
        <mesh key={sphere.id} position={sphere.position} scale={sphere.scale}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color={data.color} emissive={data.color} emissiveIntensity={0.2} />
        </mesh>
      ))}
    </group>
  );
};

// Network Graph Visualization
const NetworkGraph: React.FC<{ data: DashboardData }> = ({ data }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current && data.animate) {
      groupRef.current.rotation.y += 0.008;
    }
  });

  const network = useMemo(() => {
    const nodes = [];
    const edges = [];

    // Create nodes
    for (let i = 0; i < data.dataPoints; i++) {
      const angle = (i / data.dataPoints) * Math.PI * 2;
      const radius = 6;
      nodes.push({
        id: i,
        position: new THREE.Vector3(
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * 2,
          Math.sin(angle) * radius
        ),
      });
    }

    // Create edges (connect each node to 2-3 random neighbors)
    for (let i = 0; i < data.dataPoints; i++) {
      const connections = Math.floor(Math.random() * 2) + 2;
      for (let j = 0; j < connections; j++) {
        const target = Math.floor(Math.random() * data.dataPoints);
        if (target !== i) {
          edges.push({
            from: i,
            to: target,
          });
        }
      }
    }

    return { nodes, edges };
  }, [data.dataPoints]);

  return (
    <group ref={groupRef}>
      {/* Nodes */}
      {network.nodes.map((node) => (
        <mesh key={`node-${node.id}`} position={node.position}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color={data.color} emissive={data.color} emissiveIntensity={0.3} />
        </mesh>
      ))}

      {/* Edges */}
      {network.edges.map((edge, i) => {
        const start = network.nodes[edge.from].position;
        const end = network.nodes[edge.to].position;
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        const distance = start.distanceTo(end);

        return (
          <line key={`edge-${i}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([start.x, start.y, start.z, end.x, end.y, end.z])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color={data.color} opacity={0.3} transparent />
          </line>
        );
      })}
    </group>
  );
};

const VRScene: React.FC<VRSceneProps> = ({ data, vrMode, onExitVR }) => {
  return (
    <div className="vr-scene">
      <Canvas
        camera={{ position: [0, 5, 15], fov: 60 }}
        gl={{ antialias: true }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -5]} intensity={0.5} color="#4ecdc4" />

        {/* Render appropriate visualization */}
        {data.visualization === 'bars' && <BarChart data={data} />}
        {data.visualization === 'spheres' && <SphereCloud data={data} />}
        {data.visualization === 'network' && <NetworkGraph data={data} />}

        {/* Grid floor */}
        <gridHelper args={[30, 30, '#666', '#333']} />

        {/* Controls (only in desktop mode) */}
        {vrMode === 'desktop' && (
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
          />
        )}
      </Canvas>

      {/* VR mode overlay */}
      {vrMode === 'vr' && (
        <div className="vr-overlay">
          <button className="exit-vr-button" onClick={onExitVR}>
            ← Exit VR
          </button>
          <p className="vr-instructions">
            Look around to explore • Use controllers to interact
          </p>
        </div>
      )}
    </div>
  );
};

export default VRScene;
